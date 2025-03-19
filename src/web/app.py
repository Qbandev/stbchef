"""Web application for the trading dashboard."""

import os
import threading
import time
from datetime import datetime, timedelta
from typing import Union
from functools import lru_cache
from collections import deque
import sqlite3

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_cors import CORS

from src.agents.market_data import MarketDataAgent
from src.database.db import TradingDatabase
from src.state import TradingState
from src.tools.gemini_api import GeminiClient
from src.tools.groq_api import GroqClient
from src.tools.mistral_api import MistralClient

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

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
latest_trading_data = {}
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
        # Get market data
        print("Fetching market data...")
        market_data = market_agent.get_market_data()
        print(f"Market data fetched: ETH price = ${market_data.eth_price:.2f}")

        try:
            # Get model decisions
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

        # Store market data and decisions in database
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

        # Store individual AI decisions
        print("Storing AI decisions in database...")
        db.store_ai_decision('gemini', gemini_action, market_data.eth_price)
        db.store_ai_decision('groq', groq_action, market_data.eth_price)
        db.store_ai_decision('mistral', mistral_action, market_data.eth_price)

        # Update accuracy of previous decisions
        print("Updating decision accuracy...")
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
            latest_trading_data = data

        print(
            f"Trading data updated successfully at {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        print(
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

        while True:
            # Wait for 10 minutes
            time.sleep(600)
            # Update the trading data
            update_trading_data()

    # Create and start the background thread
    background_thread = threading.Thread(target=scheduler_thread, daemon=True)
    background_thread.start()
    print("Background scheduler started for trading data updates every 10 minutes")


@app.route("/")
def index() -> str:
    """Serve the main trading dashboard."""
    # Clean up old data periodically
    db.cleanup_old_data()
    return render_template("index.html")


@app.route("/clear-storage", methods=["POST"])
def clear_storage() -> dict:
    """Clear localStorage data for fresh start on redeployment."""
    try:
        # Create empty stats records for today to ensure we start with zeros
        today = datetime.now().strftime('%Y-%m-%d')
        with sqlite3.connect(db.db_path) as conn:
            cursor = conn.cursor()
            # Delete any existing stats for today
            cursor.execute("DELETE FROM daily_stats WHERE date = ?", (today,))

            # Insert fresh zero stats for each model
            for model in ['gemini', 'groq', 'mistral']:
                cursor.execute("""
                    INSERT INTO daily_stats (
                        date, model, total_trades, correct_trades, incorrect_trades,
                        buy_decisions, sell_decisions, hold_decisions, avg_profit
                    ) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0.0)
                """, (today, model))
            conn.commit()

        return jsonify({"status": "success", "message": "Storage cleared successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/trading-data")
def get_trading_data():
    """Get current trading data and AI model decisions."""
    try:
        # Use the cached data instead of making API calls every time
        with trading_data_lock:
            if latest_trading_data:
                return jsonify(latest_trading_data)

        # If no cached data available yet, get it now
        update_trading_data()

        with trading_data_lock:
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
def set_wallet_action() -> dict:
    """Set wallet action and store it in the database."""
    try:
        data = request.json
        wallet_address = data.get('wallet_address')
        wallet_action = data.get('wallet_action')
        eth_balance = data.get('eth_balance', 0)
        usdc_balance = data.get('usdc_balance', 0)
        eth_allocation = data.get('eth_allocation', 0)

        # Store the wallet action in the state
        db.store_wallet_action(
            wallet_address=wallet_address,
            action=wallet_action,
            eth_balance=eth_balance,
            usdc_balance=usdc_balance,
            eth_allocation=eth_allocation
        )

        return jsonify({"status": "success", "action": wallet_action})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


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


@app.route("/api/check-apis")
def check_apis() -> dict:
    """Check if all APIs are working properly."""
    results = {}

    # Check Etherscan API
    try:
        market_data = market_agent.get_market_data()
        results["etherscan"] = {
            "status": "ok",
            "eth_price": market_data.eth_price,
            "message": "Etherscan API is working"
        }
    except Exception as e:
        results["etherscan"] = {
            "status": "error",
            "message": str(e)
        }

    # Check Gemini API
    try:
        # Just a simple request to check connection
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        results["gemini"] = {
            "status": "ok",
            "api_key_set": True,
            "message": "Gemini API key is set"
        }
    except Exception as e:
        results["gemini"] = {
            "status": "error",
            "message": str(e)
        }

    # Check Groq API
    try:
        # Just a simple request to check connection
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        results["groq"] = {
            "status": "ok",
            "api_key_set": True,
            "message": "Groq API key is set"
        }
    except Exception as e:
        results["groq"] = {
            "status": "error",
            "message": str(e)
        }

    # Check Mistral API
    try:
        # Just a simple request to check connection
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            raise ValueError("MISTRAL_API_KEY environment variable not set")
        results["mistral"] = {
            "status": "ok",
            "api_key_set": True,
            "message": "Mistral API key is set"
        }
    except Exception as e:
        results["mistral"] = {
            "status": "error",
            "message": str(e)
        }

    return jsonify(results)


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
        print(f"Error handling client log: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


def main() -> None:
    """Run the Flask application."""
    # Start the background scheduler before running the app
    start_background_scheduler()

    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)


if __name__ == "__main__":
    main()
