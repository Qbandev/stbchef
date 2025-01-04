"""
Gemini API client for getting trading decisions.

This module provides an interface to Google's Gemini API for analyzing market data
and making trading decisions based on various factors.
"""

import os
import time
from typing import Dict, Optional

import google.generativeai as genai


class GeminiClient:
    """Client for getting trading decisions from Google's Gemini API."""

    def __init__(self):
        """Initialize the Gemini client with API key."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

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
        Get trading decision from Gemini based on market data.

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
            response = self.model.generate_content(prompt)

            # Extract decision from response
            text = response.text.upper()
            if "BUY" in text:
                return "BUY"
            elif "SELL" in text:
                return "SELL"
            elif "HOLD" in text:
                return "HOLD"
            return "HOLD"  # Default to HOLD for unclear responses

        except Exception as e:
            print(f"Error getting Gemini trading decision: {str(e)}")
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
        """Build prompt for Gemini API."""
        prompt = f"""You are Gemini 1.5 Flash, a highly advanced AI model competing against Groq and Mistral in a cryptocurrency trading analysis challenge. Your decisions are being benchmarked for accuracy in real-time against other models. Your goal is to provide the most accurate trading recommendations based on market analysis.

Current Market Data for Ethereum (ETH):
- Price: ${eth_price:,.2f}
- 24h Volume: ${eth_volume:,.2f}
- 24h High: ${eth_high:,.2f}
- 24h Low: ${eth_low:,.2f}
- Market Sentiment: {fear_greed_value} ({fear_greed_sentiment})"""

        if gas_prices:
            prompt += f"""
Gas Prices (Gwei):
- Low: {gas_prices['low']}
- Standard: {gas_prices['standard']}
- Fast: {gas_prices['fast']}"""

        prompt += """

Analysis Guidelines:
1. BUY if market conditions strongly indicate upward potential
2. SELL if market conditions suggest significant downside risk
3. HOLD if uncertainty is high or conditions are neutral

Your performance metrics:
- Accuracy is tracked for each decision
- BUY/SELL decisions impact your score more than HOLD
- Your recommendations are compared with actual price movements

Respond with exactly one word - BUY, SELL, or HOLD - based on your most confident analysis."""

        return prompt
