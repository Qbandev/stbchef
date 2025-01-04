"""
Gas price monitoring for ETH transactions.

This module handles fetching and processing gas price data from Etherscan.
It provides current gas prices and helps determine if transactions are cost-effective.
"""

import os
from typing import Dict, Optional, Union

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Constants
GWEI_TO_ETH = 1e-9  # 1 Gwei = 10^-9 ETH
GAS_UNITS_ETH_TRANSFER = 21000  # Standard ETH transfer gas limit
HIGH_GAS_THRESHOLD_GWEI = 100  # Consider gas high if above 100 Gwei


class GasPriceClient:
    """
    Client for fetching ETH gas prices from Etherscan.

    This class manages interaction with the Etherscan API to get current
    gas prices and determine if transactions are cost-effective.
    """

    def __init__(self):
        """Initialize the gas price client."""
        self.api_key = os.getenv("ETHERSCAN_API_KEY", "")
        self.base_url = "https://api.etherscan.io/api"
        self._last_prices: Optional[Dict[str, float]] = None
        self._last_costs: Optional[Dict[str, float]] = None

    def get_gas_price(self) -> Dict[str, Union[float, bool, Dict]]:
        """
        Get current gas prices from Etherscan.

        Returns:
            Dictionary containing:
            - gas_prices: Dictionary with different gas price levels
                - low: SafeGasPrice in Gwei
                - standard: ProposeGasPrice in Gwei
                - fast: FastGasPrice in Gwei
            - gas_costs_usd: Dictionary with estimated costs in USD
                - low: Cost for low gas price
                - standard: Cost for standard gas price
                - fast: Cost for fast gas price
            - is_gas_price_high: Boolean for if standard gas price exceeds threshold
            - recommended_level: Recommended gas price level based on prices

        Note:
            If API call fails, returns last known gas prices or None
        """
        try:
            # Get gas oracle data from Etherscan
            params = {
                "module": "gastracker",
                "action": "gasoracle",
                "apikey": self.api_key,
            }
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data["status"] != "1" or "result" not in data:
                raise ValueError("Invalid response from Etherscan API")

            result = data["result"]

            # Get gas prices for different levels
            gas_prices = {
                "low": float(result["SafeGasPrice"]),
                "standard": float(result["ProposeGasPrice"]),
                "fast": float(result["FastGasPrice"]),
            }

            if any(price <= 0 for price in gas_prices.values()):
                raise ValueError("Invalid gas prices from Etherscan")

            self._last_prices = gas_prices

            # Get ETH price for USD conversion
            eth_price_params = {
                "module": "stats",
                "action": "ethprice",
                "apikey": self.api_key,
            }
            eth_response = requests.get(
                self.base_url, params=eth_price_params, timeout=10
            )
            eth_response.raise_for_status()
            eth_data = eth_response.json()

            if eth_data["status"] != "1" or "result" not in eth_data:
                raise ValueError("Invalid response for ETH price")

            eth_price_usd = float(eth_data["result"]["ethusd"])

            # Calculate costs in USD for each level
            gas_costs_usd = {}
            for level, gwei in gas_prices.items():
                # Calculate: gas_price_gwei * (1e-9 ETH/Gwei) * gas_units
                gas_cost_eth = gwei * GWEI_TO_ETH * GAS_UNITS_ETH_TRANSFER
                # Convert to USD
                gas_costs_usd[level] = gas_cost_eth * eth_price_usd

            self._last_costs = gas_costs_usd

            # Determine if gas price is high based on standard level
            is_gas_price_high = gas_prices["standard"] > HIGH_GAS_THRESHOLD_GWEI

            # Get network utilization
            gas_used_ratio = [float(x) for x in result["gasUsedRatio"].split(",")]
            avg_utilization = sum(gas_used_ratio) / len(gas_used_ratio)

            # Recommend gas price level based on thresholds and network utilization
            if (
                avg_utilization < 0.4
                and gas_prices["low"] <= HIGH_GAS_THRESHOLD_GWEI * 0.5
            ):
                recommended_level = "low"
            elif (
                avg_utilization < 0.7
                and gas_prices["standard"] <= HIGH_GAS_THRESHOLD_GWEI
            ):
                recommended_level = "standard"
            elif gas_prices["fast"] <= HIGH_GAS_THRESHOLD_GWEI * 1.5:
                recommended_level = "fast"
            else:
                recommended_level = "wait"  # Gas prices too high, better wait

            return {
                "gas_prices": gas_prices,
                "gas_costs_usd": gas_costs_usd,
                "is_gas_price_high": is_gas_price_high,
                "recommended_level": recommended_level,
                "base_fee": float(result["suggestBaseFee"]),
                "network_utilization": avg_utilization,
            }

        except (requests.RequestException, ValueError, KeyError) as e:
            print(f"Error fetching gas price: {e}")
            if self._last_prices is not None:
                return {
                    "gas_prices": self._last_prices,
                    "gas_costs_usd": self._last_costs,
                    "is_gas_price_high": self._last_prices["standard"]
                    > HIGH_GAS_THRESHOLD_GWEI,
                    "recommended_level": "wait",
                    "base_fee": None,
                    "network_utilization": None,
                }
            return {
                "gas_prices": None,
                "gas_costs_usd": None,
                "is_gas_price_high": None,
                "recommended_level": "wait",
                "base_fee": None,
                "network_utilization": None,
            }
