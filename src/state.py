"""
Trading state management.

This module provides state management for the trading system,
including market data and trading decisions.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional


@dataclass
class MarketData:
    """Container for market data."""

    symbol: str
    price_usd: float
    timestamp: datetime
    volume: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    gas_prices: Optional[Dict[str, int]] = None
    gas_costs_usd: Optional[Dict[str, float]] = None
    is_gas_price_high: Optional[bool] = False
    recommended_gas_level: str = "standard"  # Default to standard


class TradingState:
    """Manages the current state of the trading system."""

    def __init__(self):
        """Initialize trading state."""
        self.market_data = None
        self.last_update = None

    def update_market_data(
        self,
        price: float,
        volume: float,
        high: float,
        low: float,
        gas_prices: Optional[Dict[str, int]],
        sentiment: Dict[str, str]
    ) -> None:
        """Update market data state."""
        self.market_data = MarketData(
            symbol="ethereum",
            price_usd=price,
            volume=volume,
            high_24h=high,
            low_24h=low,
            gas_prices=gas_prices,
            timestamp=datetime.now()
        )
        self.last_update = datetime.now()

    def get_current_price(self) -> Optional[float]:
        """Get current ETH price."""
        return self.market_data.price_usd if self.market_data else None
