"""
Groq API client for getting trading decisions.

This module provides an interface to Groq's API for analyzing market data
and making trading decisions based on various factors.
"""

import os
import time
from typing import Dict, Optional

import requests


class GroqClient:
    """Client for getting trading decisions from Groq's API."""

    def __init__(self):
        """Initialize the Groq client with API key."""
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    def get_trading_decision(
        self,
        eth_price: float,
        eth_volume: float,
        eth_high: float,
        eth_low: float,
        gas_prices: Optional[Dict[str, int]],
        fear_greed_value: str,
        fear_greed_sentiment: str,
    ) -> str:
        """
        Get trading decision from Groq based on market data.

        Args:
            eth_price: Current ETH price
            eth_volume: 24h trading volume
            eth_high: 24h high price
            eth_low: 24h low price
            gas_prices: Dictionary of gas prices (low, standard, fast)
            fear_greed_value: Current Fear & Greed Index value
            fear_greed_sentiment: Current market sentiment (bullish/bearish)

        Returns:
            Trading decision: "BUY", "SELL", or "HOLD"
        """
        try:
            prompt = self._build_prompt(
                eth_price,
                eth_volume,
                eth_high,
                eth_low,
                gas_prices,
                fear_greed_value,
                fear_greed_sentiment,
            )

            payload = {
                "model": "llama-3.1-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a trading assistant that analyzes Ethereum market data and provides trading recommendations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 50,
                "n": 1  # Explicitly set to 1 as per documentation
            }

            response = self.session.post(
                self.base_url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Extract decision from response
            text = data["choices"][0]["message"]["content"].upper()
            if "BUY" in text:
                return "BUY"
            elif "SELL" in text:
                return "SELL"
            elif "HOLD" in text:
                return "HOLD"
            return "HOLD"  # Default to HOLD for unclear responses

        except Exception as e:
            print(f"Error getting Groq trading decision: {str(e)}")
            return "HOLD"  # Default to HOLD on error

    def _build_prompt(
        self,
        eth_price: float,
        eth_volume: float,
        eth_high: float,
        eth_low: float,
        gas_prices: Optional[Dict[str, int]],
        fear_greed_value: str,
        fear_greed_sentiment: str,
    ) -> str:
        """Build prompt for Groq API."""
        prompt = f"""You are the Groq LLaMA-3.1-70B-Versatile model, known for your exceptional analytical capabilities in financial markets. You are participating in a real-time trading analysis competition against Gemini and Mistral models. Your recommendations are being tracked and benchmarked for accuracy.

Current Ethereum (ETH) Market Analysis:
- Current Price: ${eth_price:,.2f}
- Trading Volume (24h): ${eth_volume:,.2f}
- Price Range (24h): High ${eth_high:,.2f} / Low ${eth_low:,.2f}
- Market Psychology: {fear_greed_value} ({fear_greed_sentiment})"""

        if gas_prices:
            prompt += f"""
Network Conditions (Gas in Gwei):
- Low Priority: {gas_prices['low']}
- Standard: {gas_prices['standard']}
- High Priority: {gas_prices['fast']}"""

        prompt += """

Decision Framework:
1. BUY: Strong bullish signals with favorable risk/reward
2. SELL: Clear bearish indicators or significant downside risk
3. HOLD: Mixed signals or insufficient directional conviction

Performance Evaluation:
- Each decision affects your accuracy score
- Active decisions (BUY/SELL) weighted more heavily than HOLD
- Real-time performance tracking against other models
- Success measured by subsequent price movements

Provide your single-word trading decision (BUY, SELL, or HOLD) based on comprehensive market analysis."""

        return prompt
