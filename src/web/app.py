"""Web application for the trading dashboard."""

import os
import threading
import time
import logging
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Union
from functools import lru_cache
from collections import deque
import sqlite3

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory, session
from flask_cors import CORS

from src.agents.market_data import MarketDataAgent
from src.database.db import TradingDatabase
from src.state import TradingState
from src.tools.gemini_api import GeminiClient
from src.tools.groq_api import GroqClient
from src.tools.mistral_api import MistralClient
from src.tools.etherscan_api import EtherscanClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching for static files
CORS(app)

# --- Security & rate-limiting middleware ---------------------------------

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address

    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["120 per minute"]
    )
    limiter.init_app(app)
    logging.info(
        "[security] Flask-Limiter enabled with 120 req/min default limit")
except ImportError:
    logging.warning(
        "[security] flask-limiter not installed – rate limiting disabled")

try:
    from flask_talisman import Talisman

    # Simple CSP allowing same-origin assets and inline scripts/styles generated
    # by the build process.  Adjust as you harden.
    csp = {
        'default-src': "'self'",
        'img-src': "'self' data:",
        'script-src': "'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.ethers.io",
        'style-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
        'font-src': "'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com",
        'style-src-elem': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
        # Allow outgoing API calls to KyberSwap Aggregator & others
        'connect-src': "'self' https://aggregator-api.kyberswap.com",
        # Allow embedding external iframes such as the Uniswap swap widget
        'frame-src': "'self' https://app.uniswap.org https://*.uniswap.org"
    }
    Talisman(app, content_security_policy=csp)
    logging.info("[security] Flask-Talisman enabled with basic CSP headers")
except ImportError:
    logging.warning(
        "[security] flask-talisman not installed – CSP headers not applied")

# Initialize components with memory-efficient settings
state = TradingState()
market_agent = MarketDataAgent(state)
gemini_client = GeminiClient()
groq_client = GroqClient()
mistral_client = MistralClient()
db = TradingDatabase()

# Memory-efficient data structures
recent_prices = deque(maxlen=100)
recent_volumes = deque(maxlen=100)
recent_decisions = {
    'gemini': deque(maxlen=100),
    'groq': deque(maxlen=100),
    'mistral': deque(maxlen=100)
}

# Latest trading data cache
latest_trading_data = {
    'eth_price': 0,
    'eth_volume_24h': 0,
    'eth_high_24h': 0,
    'eth_low_24h': 0,
    'gas_prices': {
        'low': 0,
        'standard': 0,
        'fast': 0
    },
    'market_sentiment': {
        'fear_greed_value': '0',
        'fear_greed_sentiment': 'neutral'
    },
    'gemini_action': '',
    'groq_action': '',
    'mistral_action': '',
    'consensus': None,
    'model_stats': {
        'accuracy': {},
        'comparison': {},
        'daily_performance': {}
    },
    'timestamp': datetime.now().isoformat()
}
trading_data_lock = threading.Lock()

# Add thread-safe cache invalidation timestamp


class CacheInvalidationTimestamp:
    def __init__(self):
        self._timestamp = datetime.now()
        self._lock = threading.Lock()
        self._is_invalidating = False

    def get_timestamp(self) -> datetime:
        """Get the current timestamp in a thread-safe manner."""
        with self._lock:
            return self._timestamp

    def update_timestamp(self) -> None:
        """Update the timestamp in a thread-safe manner."""
        with self._lock:
            self._timestamp = datetime.now()

    def is_cache_stale(self, max_age: timedelta) -> bool:
        """Check if the cache is stale based on the maximum age."""
        with self._lock:
            return datetime.now() - self._timestamp > max_age

    def invalidate_cache(self, cache_func) -> None:
        """Safely invalidate the cache and update the timestamp."""
        with self._lock:
            if not self._is_invalidating:
                self._is_invalidating = True
                try:
                    cache_func.cache_clear()
                    self._timestamp = datetime.now()
                finally:
                    self._is_invalidating = False


model_stats_cache_timestamp = CacheInvalidationTimestamp()


@lru_cache(maxsize=32)
def calculate_model_stats(model_data_key: str) -> dict:
    """Calculate model statistics with caching."""
    # Check if cache is stale (older than 5 minutes)
    if model_stats_cache_timestamp.is_cache_stale(timedelta(minutes=5)):
        model_stats_cache_timestamp.invalidate_cache(calculate_model_stats)

    return db.get_model_comparison(days=7)


def invalidate_model_stats_cache() -> None:
    """Invalidate the model stats cache."""
    model_stats_cache_timestamp.invalidate_cache(calculate_model_stats)


def check_llm_consensus(decisions: dict) -> Union[str, None]:
    """Check if there's a consensus among LLMs."""
    buy_votes = sum(1 for d in decisions.values() if d == 'BUY')
    sell_votes = sum(1 for d in decisions.values() if d == 'SELL')

    if buy_votes >= 2:
        return 'BUY'
    elif sell_votes >= 2:
        return 'SELL'
    return None


def update_trading_data():
    """Update trading data and LLM decisions every 10 minutes."""
    global latest_trading_data

    try:
        # Get market data - this is always updated regardless of wallet connections
        print("Fetching market data...")
        market_data = market_agent.get_market_data()
        print(f"Market data fetched: ETH price = ${market_data.eth_price:.2f}")

        # Get model decisions - these can be calculated without wallets,
        # but will only be stored for specific wallets
        try:
            print("Getting Gemini trading decision...")
            gemini_action = gemini_client.get_trading_decision(
                eth_price=market_data.eth_price,
                eth_volume=market_data.eth_volume_24h,
                eth_high=market_data.eth_high_24h,
                eth_low=market_data.eth_low_24h,
                gas_prices=market_data.gas_prices,
                fear_greed_value=market_data.market_sentiment.get(
                    'fear_greed_value', ''),
                fear_greed_sentiment=market_data.market_sentiment.get(
                    'fear_greed_sentiment', '')
            )
            print(f"Gemini decision: {gemini_action}")
        except Exception as e:
            print(f"Error getting Gemini trading decision: {str(e)}")
            gemini_action = "ERROR"

        try:
            print("Getting Groq trading decision...")
            groq_action = groq_client.get_trading_decision(
                eth_price=market_data.eth_price,
                eth_volume=market_data.eth_volume_24h,
                eth_high=market_data.eth_high_24h,
                eth_low=market_data.eth_low_24h,
                gas_prices=market_data.gas_prices,
                fear_greed_value=market_data.market_sentiment.get(
                    'fear_greed_value', ''),
                fear_greed_sentiment=market_data.market_sentiment.get(
                    'fear_greed_sentiment', '')
            )
            print(f"Groq decision: {groq_action}")
        except Exception as e:
            print(f"Error getting Groq trading decision: {str(e)}")
            groq_action = "ERROR"

        try:
            print("Getting Mistral trading decision...")
            mistral_action = mistral_client.get_trading_decision(
                eth_price=market_data.eth_price,
                eth_volume=market_data.eth_volume_24h,
                eth_high=market_data.eth_high_24h,
                eth_low=market_data.eth_low_24h,
                gas_prices=market_data.gas_prices,
                fear_greed_value=market_data.market_sentiment.get(
                    'fear_greed_value', ''),
                fear_greed_sentiment=market_data.market_sentiment.get(
                    'fear_greed_sentiment', '')
            )
            print(f"Mistral decision: {mistral_action}")
        except Exception as e:
            print(f"Error getting Mistral trading decision: {str(e)}")
            mistral_action = "ERROR"

        # Check for consensus
        decisions = {
            'gemini': gemini_action,
            'groq': groq_action,
            'mistral': mistral_action
        }
        consensus = check_llm_consensus(decisions)

        # Always store market data in database - this is not wallet dependent
        timestamp = datetime.now()
        print("Storing market data in database...")
        db.store_market_data(
            eth_price=market_data.eth_price,
            eth_volume=market_data.eth_volume_24h,
            eth_high=market_data.eth_high_24h,
            eth_low=market_data.eth_low_24h,
            gas_prices=market_data.gas_prices,
            market_sentiment=market_data.market_sentiment
        )

        # Note: AI decisions are only stored when wallets are connected through the API endpoint
        print("Note: AI decisions will only be stored when wallets are connected")

        # Update accuracy of previous decisions (only for wallet-specific decisions)
        print("Updating decision accuracy for wallet-specific decisions...")
        # Only updates wallet-specific decisions
        db.update_decision_accuracy(market_data.eth_price)

        # Invalidate cache after storing new data
        print("Invalidating stats cache...")
        invalidate_model_stats_cache()

        # Get model stats
        print("Getting model stats...")
        accuracy_stats = db.get_accuracy_stats()
        model_comparison = db.get_model_comparison(days=7)
        performance_by_day = db.get_performance_by_timeframe('day')

        model_stats = {
            'accuracy': accuracy_stats,
            'comparison': model_comparison,
            'daily_performance': performance_by_day
        }

        # Create data object with market data and model decisions
        # These will be displayed in the UI but decisions won't be saved to DB without wallet
        data = {
            'eth_price': market_data.eth_price,
            'eth_volume_24h': market_data.eth_volume_24h,
            'eth_high_24h': market_data.eth_high_24h,
            'eth_low_24h': market_data.eth_low_24h,
            'gas_prices': market_data.gas_prices,
            'market_sentiment': market_data.market_sentiment,
            'gemini_action': gemini_action,
            'groq_action': groq_action,
            'mistral_action': mistral_action,
            'consensus': consensus,
            'model_stats': model_stats,
            'timestamp': timestamp.isoformat()
        }

        # Update the global cache with a lock to ensure thread safety
        with trading_data_lock:
            # Log ETH price update
            logging.debug(
                f"Updating latest_trading_data with ETH price: ${data['eth_price']:.2f}")
            # Use deepcopy to prevent reference issues with nested structures
            latest_trading_data = deepcopy(data)
            logging.debug(
                f"latest_trading_data updated, ETH price is now: ${latest_trading_data['eth_price']:.2f}")

        logging.info(
            f"Trading data updated successfully at {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        logging.info(
            f"Model decisions: Gemini: {gemini_action}, Groq: {groq_action}, Mistral: {mistral_action}")

    except Exception as e:
        print(f"Error in update_trading_data: {str(e)}")
        print(f"Error details: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


# Start the background scheduler
def start_background_scheduler():
    """Start a background thread that updates trading data every 10 minutes."""
    def scheduler_thread():
        # Initial update
        update_trading_data()

        # Counter for selective updates (gas prices update more frequently than full data)
        update_count = 0

        while True:
            # Wait for 2 minutes
            time.sleep(120)

            update_count += 1

            # Full update every 10 minutes (5 cycles)
            if update_count >= 5:
                update_trading_data()
                update_count = 0
            else:
                # Only update gas prices on intermediate cycles
                try:
                    # Update just gas prices for more real-time data
                    with trading_data_lock:
                        if latest_trading_data:
                            # Get fresh gas prices
                            gas_prices = EtherscanClient().get_gas_prices()
                            if gas_prices:
                                latest_trading_data['gas_prices'] = gas_prices
                                logging.debug(
                                    f"Updated gas prices: {gas_prices}")
                                print(
                                    f"DEBUG: Updated gas prices in latest_trading_data: {gas_prices}")
                except Exception as e:
                    logging.error(f"Error updating gas prices: {str(e)}")
                    print(f"ERROR: Failed to update gas prices: {str(e)}")

    # Create and start the background thread
    background_thread = threading.Thread(target=scheduler_thread, daemon=True)
    background_thread.start()
    print("Background scheduler started: Full data updates every 10 minutes, gas prices every 2 minutes")


@app.route("/")
def index() -> str:
    """Render the index page."""
    return render_template("index.html")


@app.route("/stats-test")
def test_stats() -> str:
    """Render the test stats page."""
    return render_template("test_stats.html")


@app.route("/clear-storage", methods=["GET", "POST"])
def clear_storage() -> Union[str, dict]:
    """Clear localStorage data for fresh start on redeployment."""
    if request.method == "GET":
        return render_template("clear-storage.html")

    try:
        # Create empty stats records for today to ensure we start with zeros
        today = datetime.now().strftime('%Y-%m-%d')
        logging.info(
            f"[clear-storage] Attempting to clear and reset daily_stats for date: {today} on DB: {db.db_path}")
        with sqlite3.connect(db.db_path) as conn:
            cursor = conn.cursor()
            logging.info(
                f"[clear-storage] Deleting existing stats for {today}...")
            # Delete any existing stats for today
            cursor.execute("DELETE FROM daily_stats WHERE date = ?", (today,))
            logging.info(
                f"[clear-storage] Deleted {cursor.rowcount} rows for {today}.")

            # Insert fresh zero stats for each model
            for model in ['gemini', 'groq', 'mistral']:
                logging.info(
                    f"[clear-storage] Inserting zero stats for model {model} for {today}...")
                cursor.execute("""
                    INSERT INTO daily_stats (
                        date, model, total_trades, correct_trades, incorrect_trades,
                        buy_decisions, sell_decisions, hold_decisions, avg_profit
                    ) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0.0)
                """, (today, model))
            conn.commit()
            logging.info(
                f"[clear-storage] Successfully cleared and reset daily_stats for {today}.")

        return jsonify({"status": "success", "message": "Storage cleared successfully"})
    except Exception as e:
        # Log the full traceback
        logging.error(
            f"[clear-storage] Error during POST request: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/trading-data")
def get_trading_data():
    """Get current trading data and AI model decisions."""
    try:
        # Use the cached data instead of making API calls every time
        with trading_data_lock:
            if latest_trading_data:
                print(
                    f"DEBUG: Using cached trading data, ETH price: ${latest_trading_data.get('eth_price', 0):.2f}")
                return jsonify(latest_trading_data)
            else:
                print("DEBUG: No cached trading data available, fetching new data")

        # If no cached data available yet, get it now
        update_trading_data()

        with trading_data_lock:
            print(
                f"DEBUG: Returning freshly updated trading data, ETH price: ${latest_trading_data.get('eth_price', 0):.2f}")
            return jsonify(latest_trading_data)

    except Exception as e:
        print(f"Error in get_trading_data: {str(e)}")  # Add logging
        return jsonify({'error': str(e)}), 500


@app.route("/api/historical-data")
def get_historical_data() -> Union[dict, tuple[dict, int]]:
    """Get historical market data and AI decisions."""
    try:
        # Get parameters
        timeframe = request.args.get('timeframe', 'day')
        days = int(request.args.get('days', '7'))

        # Get data
        market_data = db.get_recent_market_data(
            limit=24*days)  # Get more data points for charts
        decisions = db.get_recent_decisions(limit=24*days)
        performance = db.get_performance_by_timeframe(timeframe)
        comparison = db.get_model_comparison(days=days)

        response = {
            "market_data": market_data,
            "decisions": decisions,
            "performance": performance,
            "model_comparison": comparison
        }

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/model-stats")
def get_model_stats() -> Union[dict, tuple[dict, int]]:
    """Get detailed model performance statistics."""
    try:
        days = int(request.args.get('days', '7'))
        timeframe = request.args.get('timeframe', 'day')

        stats = {
            "accuracy": db.get_accuracy_stats(),
            "comparison": db.get_model_comparison(days=days),
            "performance": db.get_performance_by_timeframe(timeframe)
        }

        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/daily-stats")
def get_daily_stats() -> Union[dict, tuple[dict, int]]:
    """Get the daily statistics for each model."""
    try:
        days = int(request.args.get('days', '7'))
        stats = db.get_daily_stats(days=days)
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/set-wallet-action", methods=["POST"])
def set_wallet_action() -> Union[dict, tuple[dict, int]]:
    """Set wallet action and store it in the database."""
    try:
        # Validate required input data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Check required fields
        required_fields = ["wallet_address", "wallet_action"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate wallet action value
        valid_actions = ["BUY", "SELL", "HOLD"]
        if data["wallet_action"] not in valid_actions:
            return jsonify({"error": f"Invalid wallet_action. Must be one of: {', '.join(valid_actions)}"}), 400

        # Get additional data with defaults
        wallet_address = data["wallet_address"]
        wallet_action = data["wallet_action"]
        eth_balance = data.get('eth_balance', 0)
        usdc_balance = data.get('usdc_balance', 0)
        eth_allocation = data.get('eth_allocation', 0)
        network = data.get('network', 'unknown')

        # Store the wallet action in the database
        db.store_wallet_action(
            wallet_address=wallet_address,
            action=wallet_action,
            eth_balance=eth_balance,
            usdc_balance=usdc_balance,
            eth_allocation=eth_allocation,
            network=network
        )

        return jsonify({"status": "success", "action": wallet_action})
    except ValueError as ve:
        # Handle specific ValueError from missing market data
        # Service Unavailable
        return jsonify({"error": str(ve)}), 503
    except Exception as e:
        logging.error(f"Error recording wallet action: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/wallet-stats")
def get_wallet_stats() -> Union[dict, tuple[dict, int]]:
    """Get performance stats filtered by wallet."""
    try:
        wallet_address = request.args.get('wallet_address')
        if not wallet_address:
            return jsonify({"error": "Wallet address is required"}), 400

        # Get wallet-specific stats from database
        stats = db.get_wallet_stats(wallet_address)
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/wallet/connection", methods=["GET"])
def get_wallet_connection() -> Union[dict, tuple[dict, int]]:
    """Get wallet connection status."""
    try:
        wallet_address = request.args.get('wallet_address')
        if not wallet_address:
            # If no wallet address provided, return list of all connected wallets
            connected_wallets = db.get_connected_wallets()
            return jsonify({
                "connected_wallets": connected_wallets,
                "most_recent_wallet": connected_wallets[0] if connected_wallets else None
                # Not automatically selecting a default wallet - client should decide based on context
            })

        # Get connection status for specific wallet
        connection_status = db.get_wallet_connection(wallet_address)
        return jsonify(connection_status)
    except Exception as e:
        logging.error(f"Error getting wallet connection: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/wallet/connection", methods=["POST"])
def update_wallet_connection() -> Union[dict, tuple[dict, int]]:
    """Update wallet connection status."""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Check required fields
        required_fields = ["wallet_address", "is_connected"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        wallet_address = data["wallet_address"]
        is_connected = data["is_connected"]

        # Update the connection status in the database
        db.update_wallet_connection(wallet_address, is_connected)

        return jsonify({
            "status": "success",
            "wallet_address": wallet_address,
            "is_connected": is_connected
        })
    except Exception as e:
        logging.error(f"Error updating wallet connection: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/static/<path:path>')
def send_static(path):
    """Serve static files."""
    return send_from_directory('static', path)


@app.route('/api/log', methods=['POST'])
def client_log():
    """Handle client-side log messages."""
    try:
        log_data = request.json
        log_level = log_data.get('level', 'info')
        message = log_data.get('message', '')
        context = log_data.get('context', {})

        # Print to server console with timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] Client {log_level}: {message} | Context: {context}")

        # In production, you might want to save these logs to a file or database

        return jsonify({"status": "success", "message": "Log recorded"}), 200
    except Exception as e:
        logging.error(f"Error handling client log: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/store-ai-decision", methods=["POST"])
def store_ai_decision() -> Union[dict, tuple[dict, int]]:
    """Store AI decision for a specific wallet."""
    try:
        # Validate required input data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Check required fields
        required_fields = ["model", "decision", "eth_price", "wallet_address"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Store the AI decision in the database
        db.store_ai_decision(
            model=data["model"],
            decision=data["decision"],
            eth_price=data["eth_price"],
            wallet_address=data["wallet_address"]
        )

        return jsonify({"status": "success", "message": "AI decision stored successfully"})
    except Exception as e:
        logging.error(f"Error storing AI decision: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/swaps/price")
def get_swap_quote():
    """Return a slippage-adjusted quote for a swap without executing it.

    Query params:
      direction: 'eth-to-usdc' | 'usdc-to-eth' (default eth-to-usdc)
      amount: numeric string – amount of *from* token
    Response JSON: { direction, amount, quote, slippage_bps }
    """
    try:
        direction = request.args.get('direction', 'eth-to-usdc').lower()
        amount_str = request.args.get('amount', '0')

        try:
            amount = float(amount_str)
        except ValueError:
            return jsonify({"error": "Invalid amount"}), 400

        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400

        # Pull latest ETH price from cached trading data (USD/USDC is 1:1 here)
        with trading_data_lock:
            eth_price = float(latest_trading_data.get('eth_price', 0))

        if eth_price == 0:
            # Fallback to live fetch if cache empty
            eth_price = market_agent.get_market_data().eth_price

        SLIPPAGE_FACTOR = 0.995  # 0.5% slippage just like contract

        if direction == 'eth-to-usdc':
            quote = amount * eth_price * SLIPPAGE_FACTOR
        elif direction == 'usdc-to-eth':
            quote = (amount / eth_price) * SLIPPAGE_FACTOR
        else:
            return jsonify({"error": "Unsupported direction"}), 400

        return jsonify({
            "direction": direction,
            "amount": amount,
            "quote": quote,
            "slippage_bps": 50
        })
    except Exception as e:
        logging.error(f"Error in get_swap_quote: {str(e)}")
        return jsonify({"error": str(e)}), 500


def main() -> None:
    """Run the Flask application."""
    # Start the background scheduler before running the app
    start_background_scheduler()

    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)


if __name__ == "__main__":
    main()
