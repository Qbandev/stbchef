"""
Mistral AI client for getting trading decisions.

This module provides an interface to Mistral AI's API for analyzing market data
and making trading decisions based on various factors.
"""

import os
import time
from typing import Dict, Optional
import numpy as np
from datetime import datetime, timedelta

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
        self.price_history = []
        self.decision_history = []
        self.max_history = 100  # Keep last 100 data points

    def calculate_technical_indicators(self, prices: list) -> Dict[str, float]:
        """Calculate technical indicators for analysis."""
        if len(prices) < 2:
            return {
                'volatility': 0,
                'momentum': 0,
                'rsi': 50,
                'price_trend': 'neutral',
                'volatility_level': 'low'
            }

        prices = np.array(prices)

        # Calculate price changes
        price_changes = np.diff(prices)

        # Calculate volatility (standard deviation of price changes)
        try:
            volatility = np.std(price_changes) if len(price_changes) > 0 else 0
        except Exception as e:
            print(f"Error calculating volatility: {str(e)}")
            volatility = 0

        # Calculate momentum (rate of price change)
        try:
            momentum = np.mean(
                price_changes[-5:]) if len(price_changes) >= 5 else np.mean(price_changes)
        except Exception as e:
            print(f"Error calculating momentum: {str(e)}")
            momentum = 0

        # Calculate RSI-like indicator (simplified)
        rsi = 50  # Default neutral value
        try:
            if len(prices) >= 14:
                gains = np.where(price_changes > 0, price_changes, 0)
                losses = np.where(price_changes < 0, -price_changes, 0)
                avg_gain = np.mean(gains[-14:])
                avg_loss = np.mean(losses[-14:])
                if avg_loss != 0:
                    rs = avg_gain / avg_loss
                    if rs != 0:
                        rsi = 100 - (100 / (1 + rs))
        except Exception as e:
            print(f"Error calculating RSI: {str(e)}")

        # Default values for derived metrics
        price_trend = 'neutral'
        volatility_level = 'low'

        try:
            price_trend = 'up' if momentum > 0 else 'down'
            mean_abs_change = np.mean(np.abs(price_changes)) if len(
                price_changes) > 0 else 0
            volatility_level = 'high' if mean_abs_change > 0 and volatility > mean_abs_change * 2 else 'low'
        except Exception as e:
            print(f"Error calculating derived indicators: {str(e)}")

        return {
            'volatility': volatility,
            'momentum': momentum,
            'rsi': rsi,
            'price_trend': price_trend,
            'volatility_level': volatility_level
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
            decision = "HOLD"  # Default to HOLD

            # Validate that choices array exists and is not empty
            if 'choices' in data and data['choices'] and len(data['choices']) > 0:
                if 'message' in data['choices'][0] and 'content' in data['choices'][0]['message']:
                    text = data["choices"][0]["message"]["content"].upper()
                    if "BUY" in text:
                        decision = "BUY"
                    elif "SELL" in text:
                        decision = "SELL"
                else:
                    print("Warning: Invalid message format in Mistral API response")
            else:
                print("Warning: Empty choices array in Mistral API response")

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
        indicators: Dict[str, float],
    ) -> str:
        """Build prompt for Mistral API."""
        prompt = f"""You are Mistral Large, a sophisticated AI model specializing in statistical analysis and portfolio optimization. Your goal is to provide optimal trading recommendations for ETH/USDC rebalancing based on comprehensive market analysis.

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

Portfolio Rebalancing Strategy:
1. Target Allocation:
   - ETH: 60-80% in bullish conditions
   - USDC: 40-20% in bullish conditions
   - Adjust based on market conditions and risk tolerance

2. Rebalancing Triggers:
   - Price movement beyond 5% threshold
   - Significant change in market sentiment
   - Volatility spikes
   - Gas price optimization opportunities

3. Risk Management:
   - Maximum position size: 80% in single asset
   - Minimum USDC reserve: 20% for opportunities
   - Gas cost threshold: Only rebalance if potential profit > 2x gas cost
   - Slippage tolerance: Max 0.5% for large trades

4. Market Analysis:
   - Use volatility to adjust position sizes
   - Use momentum to predict short-term direction
   - Use RSI to identify overbought/oversold conditions
   - Consider price range for support/resistance levels
   - Factor in market sentiment for trend confirmation

5. Execution Strategy:
   - Split large trades into smaller chunks
   - Use limit orders for better prices
   - Consider gas price trends for timing
   - Account for market impact in large trades

6. Performance Metrics:
   - Track profit/loss after fees
   - Monitor risk-adjusted returns
   - Measure portfolio rebalancing efficiency
   - Evaluate market impact minimization

7. Decision Making:
   - BUY if:
     * Price below support level
     * RSI oversold
     * Strong bullish momentum
     * Low gas prices
     * ETH allocation below target
   - SELL if:
     * Price above resistance
     * RSI overbought
     * Bearish momentum
     * High gas prices
     * ETH allocation above target
   - HOLD if:
     * Price within normal range
     * Current allocation optimal
     * Gas prices unfavorable
     * No clear directional bias

Respond with exactly one word - BUY, SELL, or HOLD - based on your comprehensive analysis of market conditions and portfolio optimization strategy."""

        return prompt
