"""
Mistral AI client for getting trading decisions.

This module provides an interface to Mistral AI's API for analyzing market data
and making trading decisions based on various factors.
"""

import os
import time
from typing import Dict, Optional

import requests


class MistralClient:
    """Client for getting trading decisions from Mistral AI's API."""

    def __init__(self):
        """Initialize the Mistral client with API key."""
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            raise ValueError("MISTRAL_API_KEY environment variable not set")
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
        self.base_url = "https://api.mistral.ai/v1/chat/completions"

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
        Get trading decision from Mistral based on market data.

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
                "model": "mistral-medium",
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
                "max_tokens": 50
            }

            response = self.session.post(self.base_url, json=payload)
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
            print(f"Error getting Mistral trading decision: {str(e)}")
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
        """Build prompt for Mistral API."""
        prompt = f"""You are Mistral Large, a sophisticated AI model competing in a real-time cryptocurrency trading analysis challenge against Gemini and Groq models. Your trading recommendations are being continuously evaluated and benchmarked for accuracy against your competitors.

ETH Market Snapshot:
📊 Price: ${eth_price:,.2f}
📈 24h High: ${eth_high:,.2f}
📉 24h Low: ${eth_low:,.2f}
💹 24h Volume: ${eth_volume:,.2f}
🎯 Market Sentiment: {fear_greed_value} ({fear_greed_sentiment})"""

        if gas_prices:
            prompt += f"""
⚡ Network Status (Gwei):
   - Economy: {gas_prices['low']}
   - Regular: {gas_prices['standard']}
   - Priority: {gas_prices['fast']}"""

        prompt += """

Trading Strategy Guidelines:
🟢 BUY: Strong upward momentum, positive market indicators
🔴 SELL: Clear downward pressure, deteriorating conditions
⚪ HOLD: Uncertain trends or balanced risk factors

Competition Rules:
- Your accuracy is tracked in real-time
- BUY/SELL decisions have higher impact than HOLD
- Performance is measured against actual price movements
- You're competing directly with other AI models

Make your most strategic decision now. Respond with exactly one word: BUY, SELL, or HOLD."""

        return prompt
