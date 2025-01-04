"""
Market Data Agent.

This module handles fetching and processing market data from Etherscan.
It includes caching and rate limiting to avoid API throttling.
"""

import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from src.tools.etherscan_api import EtherscanClient
from src.tools.fear_greed_api import FearGreedClient
from src.state import TradingState


@dataclass
class MarketData:
    """Container for market data."""

    eth_price: float
    eth_volume_24h: float
    eth_high_24h: float
    eth_low_24h: float
    gas_prices: Optional[Dict[str, int]]
    market_sentiment: Dict[str, str]


class MarketDataAgent:
    """
    Agent for fetching and managing market data.

    This class manages the interaction with the Etherscan API and
    Fear & Greed Index to provide market data and sentiment analysis.
    It includes caching to prevent excessive API calls.
    """

    def __init__(self, state: Optional[TradingState] = None):
        """Initialize the market data agent."""
        self.etherscan = EtherscanClient()
        self.fear_greed = FearGreedClient()
        self.state = state

    def update_market_data(self) -> MarketData:
        """
        Update and return current market data.

        Returns:
            MarketData object containing current market metrics
        """
        return self.get_market_data()

    def get_market_data(self) -> MarketData:
        """
        Get current market data including price, volume, and sentiment.

        Returns:
            MarketData object containing current market metrics
        """
        # Get ETH price data from Etherscan
        eth_price, eth_volume, eth_high, eth_low = self.etherscan.get_eth_price()

        # Get gas prices
        gas_prices = self.etherscan.get_gas_prices()

        # Get market sentiment
        sentiment = self.fear_greed.get_fear_greed_index()

        # Update state if available
        if self.state:
            self.state.update_market_data(
                eth_price, eth_volume, eth_high, eth_low, gas_prices, sentiment)

        return MarketData(
            eth_price=eth_price,
            eth_volume_24h=eth_volume,
            eth_high_24h=eth_high,
            eth_low_24h=eth_low,
            gas_prices=gas_prices,
            market_sentiment=sentiment
        )
