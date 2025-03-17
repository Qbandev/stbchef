"""
Gemini API client for getting trading decisions.

This module provides an interface to Google's Gemini API for analyzing market data
and making trading decisions based on various factors.
"""

import os
import time
from typing import Dict, Optional
import numpy as np
from datetime import datetime, timedelta

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
        self.price_history = []
        self.decision_history = []
        self.max_history = 100  # Keep last 100 data points

    def calculate_technical_indicators(self, prices: list) -> Dict[str, float]:
        """Calculate technical indicators for analysis."""
        if len(prices) < 2:
            return {}

        prices = np.array(prices)

        # Calculate price changes
        price_changes = np.diff(prices)

        # Calculate volatility (standard deviation of price changes)
        volatility = np.std(price_changes) if len(price_changes) > 0 else 0

        # Calculate momentum (rate of price change)
        momentum = np.mean(
            price_changes[-5:]) if len(price_changes) >= 5 else np.mean(price_changes)

        # Calculate RSI-like indicator (simplified)
        if len(prices) >= 14:
            gains = np.where(price_changes > 0, price_changes, 0)
            losses = np.where(price_changes < 0, -price_changes, 0)
            avg_gain = np.mean(gains[-14:])
            avg_loss = np.mean(losses[-14:])
            rs = avg_gain / avg_loss if avg_loss != 0 else 0
            rsi = 100 - (100 / (1 + rs)) if rs != 0 else 100
        else:
            rsi = 50  # Neutral value if not enough data

        return {
            'volatility': volatility,
            'momentum': momentum,
            'rsi': rsi,
            'price_trend': 'up' if momentum > 0 else 'down',
            'volatility_level': 'high' if volatility > np.mean(np.abs(price_changes)) * 2 else 'low'
        }

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
            # Update price history
            self.price_history.append(eth_price)
            if len(self.price_history) > self.max_history:
                self.price_history.pop(0)

            # Calculate technical indicators
            indicators = self.calculate_technical_indicators(
                self.price_history)

            prompt = self._build_prompt(
                eth_price,
                eth_volume,
                eth_high,
                eth_low,
                gas_prices,
                fear_greed_value,
                fear_greed_sentiment,
                indicators
            )
            response = self.model.generate_content(prompt)

            # Extract decision from response
            text = response.text.upper()
            decision = "HOLD"  # Default to HOLD
            if "BUY" in text:
                decision = "BUY"
            elif "SELL" in text:
                decision = "SELL"

            # Update decision history
            self.decision_history.append({
                'timestamp': datetime.now(),
                'price': eth_price,
                'decision': decision,
                'indicators': indicators
            })
            if len(self.decision_history) > self.max_history:
                self.decision_history.pop(0)

            return decision

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
        indicators: Dict[str, float],
    ) -> str:
        """Build prompt for Gemini API."""
        prompt = f"""You are Gemini 1.5 Flash, a highly advanced AI model specializing in statistical analysis and portfolio optimization. Your goal is to provide optimal trading recommendations for ETH/USDC rebalancing based on comprehensive market analysis.

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

        prompt += f"""
Technical Analysis:
- Volatility: {indicators['volatility']:.2f} (Level: {indicators['volatility_level']})
- Momentum: {indicators['momentum']:.2f} (Trend: {indicators['price_trend']})
- RSI: {indicators['rsi']:.2f}
- Price Range: ${eth_low:,.2f} - ${eth_high:,.2f} (${eth_high - eth_low:,.2f} spread)

Portfolio Rebalancing Guidelines:
1. Consider optimal ETH/USDC ratio based on:
   - Current market conditions
   - Risk tolerance (volatility)
   - Expected returns (momentum)
   - Market sentiment
   - Gas costs for rebalancing

2. Statistical Analysis:
   - Use volatility to assess risk
   - Use momentum to predict short-term direction
   - Use RSI to identify overbought/oversold conditions
   - Consider price range for support/resistance levels

3. Decision Making:
   - BUY if conditions suggest increasing ETH allocation
   - SELL if conditions suggest increasing USDC allocation
   - HOLD if current allocation is optimal

4. Risk Management:
   - Consider gas costs in profit calculations
   - Account for slippage in large trades
   - Factor in market impact of rebalancing

Your performance metrics:
- Accuracy is tracked for each decision
- Decisions are evaluated based on:
  * Profit/loss after fees
  * Risk-adjusted returns
  * Portfolio rebalancing efficiency
  * Market impact minimization

Respond with exactly one word - BUY, SELL, or HOLD - based on your statistical analysis and portfolio optimization strategy."""

        return prompt
