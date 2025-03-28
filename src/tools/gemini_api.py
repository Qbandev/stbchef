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
        self.model = genai.GenerativeModel("gemini-2.0-flash")
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
            decision = "HOLD"  # Default to HOLD

            # Validate that response exists and has text attribute
            if response and hasattr(response, 'text') and response.text:
                text = response.text.upper()
                if "BUY" in text:
                    decision = "BUY"
                elif "SELL" in text:
                    decision = "SELL"
            else:
                print("Warning: Invalid or empty response from Gemini API")

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
   - Use RSI to identify overbought/oversold conditions (RSI > 70 is overbought, RSI < 30 is oversold)
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

7. Critical Evaluation for HOLD Decision:
   - Always consider HOLD as a valid option
   - HOLD is recommended when:
     * Price remains within a 1% range of previous price
     * No clear directional bias
     * Gas prices are high relative to potential profit
     * Current position is already optimal given market conditions
     * Volatility is low and no significant market events expected

8. Decision Making:
   - BUY if and only if:
     * Price below support level
     * RSI is below 30 (oversold condition)
     * Strong bullish momentum with indicators confirming uptrend
     * Low gas prices relative to potential gain
     * ETH allocation is significantly below target (under 50%)
   - SELL if and only if:
     * Price above established resistance
     * RSI above 70 (overbought condition)
     * Clear bearish momentum with confirming indicators
     * High gas prices do not negate potential savings
     * ETH allocation exceeds target range (over 85%)
   - HOLD if:
     * Price within normal range (within 1-2% of recent average)
     * Current allocation within optimal target range
     * Gas prices unfavorable relative to potential gain/loss
     * No clear directional bias in technical indicators
     * Market sentiment is neutral or contradictory signals present

Respond with exactly one word - BUY, SELL, or HOLD - based on your comprehensive analysis of market conditions and portfolio optimization strategy. Remember that HOLD is often the optimal choice when conditions don't strongly favor buying or selling."""

        return prompt
