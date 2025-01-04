"""Web application for the trading dashboard."""

import os
from datetime import datetime
from typing import Union

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

# Initialize components
state = TradingState()
market_agent = MarketDataAgent(state)
gemini_client = GeminiClient()
groq_client = GroqClient()
mistral_client = MistralClient()
db = TradingDatabase()


@app.route("/")
def index() -> str:
    """Serve the main trading dashboard."""
    return render_template("index.html")


@app.route("/api/trading-data")
def get_trading_data() -> Union[dict, tuple[dict, int]]:
    """Get current trading data including ETH price and trading decisions."""
    try:
        # Get market data
        market_data = market_agent.get_market_data()

        # Store market data in database
        db.store_market_data(
            eth_price=market_data.eth_price,
            eth_volume=market_data.eth_volume_24h,
            eth_high=market_data.eth_high_24h,
            eth_low=market_data.eth_low_24h,
            gas_prices=market_data.gas_prices,
            market_sentiment=market_data.market_sentiment
        )

        # Get trading decisions from AI models
        gemini_action = gemini_client.get_trading_decision(
            eth_price=market_data.eth_price,
            eth_volume=market_data.eth_volume_24h,
            eth_high=market_data.eth_high_24h,
            eth_low=market_data.eth_low_24h,
            gas_prices=market_data.gas_prices,
            fear_greed_value=market_data.market_sentiment["fear_greed_value"],
            fear_greed_sentiment=market_data.market_sentiment["fear_greed_sentiment"],
        )

        groq_action = groq_client.get_trading_decision(
            eth_price=market_data.eth_price,
            eth_volume=market_data.eth_volume_24h,
            eth_high=market_data.eth_high_24h,
            eth_low=market_data.eth_low_24h,
            gas_prices=market_data.gas_prices,
            fear_greed_value=market_data.market_sentiment["fear_greed_value"],
            fear_greed_sentiment=market_data.market_sentiment["fear_greed_sentiment"],
        )

        mistral_action = mistral_client.get_trading_decision(
            eth_price=market_data.eth_price,
            eth_volume=market_data.eth_volume_24h,
            eth_high=market_data.eth_high_24h,
            eth_low=market_data.eth_low_24h,
            gas_prices=market_data.gas_prices,
            fear_greed_value=market_data.market_sentiment["fear_greed_value"],
            fear_greed_sentiment=market_data.market_sentiment["fear_greed_sentiment"],
        )

        # Store AI decisions in database
        db.store_ai_decision("gemini", gemini_action, market_data.eth_price)
        db.store_ai_decision("groq", groq_action, market_data.eth_price)
        db.store_ai_decision("mistral", mistral_action, market_data.eth_price)

        # Update accuracy of previous decisions
        db.update_decision_accuracy(market_data.eth_price)

        # Get performance statistics
        accuracy_stats = db.get_accuracy_stats()
        model_comparison = db.get_model_comparison(days=7)
        performance_by_day = db.get_performance_by_timeframe('day')

        # Format response
        response = {
            "timestamp": datetime.now().isoformat(),
            "eth_price": market_data.eth_price,
            "eth_volume_24h": market_data.eth_volume_24h,
            "eth_high_24h": market_data.eth_high_24h,
            "eth_low_24h": market_data.eth_low_24h,
            "gas_prices": market_data.gas_prices,
            "gemini_action": gemini_action,
            "groq_action": groq_action,
            "mistral_action": mistral_action,
            "market_sentiment": market_data.market_sentiment,
            "model_stats": {
                "accuracy": accuracy_stats,
                "comparison": model_comparison,
                "daily_performance": performance_by_day
            }
        }

        return jsonify(response)
    except (ValueError, requests.RequestException) as e:
        return jsonify({"error": str(e)}), 500


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


@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)


def main() -> None:
    """Run the Flask application."""
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)


if __name__ == "__main__":
    main()
