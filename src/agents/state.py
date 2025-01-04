"""
State management for the trading system.

This module contains classes for managing market data and trading state.
It provides a centralized way to track ETH price, trading positions,
and risk metrics.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Dict, Optional


class TradingAction(Enum):
    """Trading action signals for position management."""

    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class MarketData:
    """
    Holds current market data for ETH.

    Attributes:
        symbol: Trading symbol (e.g., 'ethereum')
        price_usd: Current price in USD
        timestamp: Time when the data was fetched
        volume: 24-hour trading volume (optional)
        high_24h: 24-hour high price (optional)
        low_24h: 24-hour low price (optional)
        gas_prices: Dictionary with different gas price levels in Gwei (optional)
        gas_costs_usd: Dictionary with estimated costs in USD (optional)
        is_gas_price_high: Boolean indicating if gas price is above threshold (optional)
        recommended_gas_level: Recommended gas price level (optional)
    """

    symbol: str
    price_usd: float
    timestamp: datetime
    volume: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    gas_prices: Optional[Dict[str, float]] = None
    gas_costs_usd: Optional[Dict[str, float]] = None
    is_gas_price_high: Optional[bool] = None
    recommended_gas_level: Optional[str] = None

    @property
    def price(self) -> float:
        """Current price in USD."""
        return self.price_usd

    @property
    def high(self) -> float:
        """24h high price."""
        return self.high_24h if self.high_24h is not None else self.price_usd

    @property
    def low(self) -> float:
        """24h low price."""
        return self.low_24h if self.low_24h is not None else self.price_usd

    @property
    def gas_is_acceptable(self) -> bool:
        """Check if gas price is acceptable for trading."""
        return (
            not self.is_gas_price_high if self.is_gas_price_high is not None else True
        )

    @property
    def gas_price_gwei(self) -> Optional[float]:
        """Get the standard gas price in Gwei."""
        return self.gas_prices.get("standard") if self.gas_prices else None

    @property
    def gas_price_usd(self) -> Optional[float]:
        """Get the standard gas price in USD."""
        return self.gas_costs_usd.get("standard") if self.gas_costs_usd else None


class TradingState:
    """
    Manages the current state of the trading system.

    This class maintains the current market data and trading decisions.
    It ensures that all components have access to the same consistent state.

    Attributes:
        market_data: Current market data for ETH
        trading_action: Current trading action (BUY/SELL/HOLD)
    """

    def __init__(self):
        """Initialize trading state."""
        self.market_data: Optional[MarketData] = None
        self.trading_action: TradingAction = TradingAction.HOLD

    def update_market_data(self, market_data: MarketData) -> None:
        """
        Update the current market data.

        Args:
            market_data: New market data to store
        """
        self.market_data = market_data

    def update_trading_action(self, action: TradingAction) -> None:
        """
        Update the current trading action.

        Args:
            action: New trading action
        """
        self.trading_action = action

    def get_current_price(self) -> float:
        """Get current price from market data."""
        if self.market_data is None:
            return 0.0
        return self.market_data.price_usd
