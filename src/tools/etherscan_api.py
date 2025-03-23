"""
Etherscan API client for fetching Ethereum data.

This module provides a clean interface to the Etherscan API,
focusing on ETH price data and gas prices.
"""

import os
import time
from typing import Dict, Optional, Tuple

import requests


class EtherscanClient:
    """Client for interacting with the Etherscan API."""

    def __init__(self):
        """Initialize the Etherscan API client."""
        api_key = os.getenv("ETHERSCAN_API_KEY")
        if not api_key:
            raise ValueError("ETHERSCAN_API_KEY environment variable not set")
        self.api_key = api_key
        self.base_url = "https://api.etherscan.io/api"
        self.session = requests.Session()

        # Cache for API responses
        self._price_cache = {"timestamp": 0, "data": None}
        self._gas_cache = {"timestamp": 0, "data": None}

        # Cache duration in seconds
        self.price_cache_duration = int(
            os.getenv("MARKET_DATA_CACHE_DURATION", "10"))
        self.gas_cache_duration = int(
            os.getenv("GAS_PRICE_CACHE_DURATION", "30"))

    def get_eth_price(self) -> Tuple[float, float, float, float]:
        """
        Get current ETH price and 24h metrics.

        Returns:
            Tuple containing (current_price, volume_24h, high_24h, low_24h)
        """
        current_time = time.time()

        # Return cached data if still valid
        if current_time - self._price_cache["timestamp"] < self.price_cache_duration and self._price_cache["data"]:
            return self._price_cache["data"]

        try:
            # Get ETH price in USD
            params = {
                "module": "stats",
                "action": "ethprice",
                "apikey": self.api_key
            }

            response = self.session.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

            if data["status"] != "1" or "result" not in data:
                error_msg = data.get('message', 'Unknown error')
                print(f"Etherscan API error: {error_msg}")
                print(f"Full response: {data}")
                raise ValueError(
                    f"Invalid response from Etherscan: {error_msg}")

            result = data["result"]
            if not result or "ethusd" not in result:
                print(f"Unexpected response format: {result}")
                raise ValueError("Missing ETH price data in response")

            current_price = float(result["ethusd"])

            # For simplicity, we'll estimate these values
            # In a production environment, you'd want to get more accurate data
            volume_24h = float(result.get("ethbtc_timestamp", "0")) * \
                current_price  # Using timestamp as mock volume
            high_24h = current_price * 1.05  # Estimated
            low_24h = current_price * 0.95   # Estimated

            # Cache the results
            self._price_cache = {
                "timestamp": current_time,
                "data": (current_price, volume_24h, high_24h, low_24h)
            }

            return current_price, volume_24h, high_24h, low_24h

        except requests.exceptions.RequestException as e:
            print(f"Network error while fetching ETH price: {str(e)}")
            if self._price_cache["data"]:
                return self._price_cache["data"]
            return 0.0, 0.0, 0.0, 0.0
        except Exception as e:
            print(f"Unexpected error fetching ETH price: {str(e)}")
            if self._price_cache["data"]:
                return self._price_cache["data"]
            return 0.0, 0.0, 0.0, 0.0

    def get_gas_prices(self) -> Optional[Dict[str, int]]:
        """
        Get current gas prices.

        Returns:
            Dictionary with gas prices (low, standard, fast) or None on error
        """
        current_time = time.time()

        # Force refresh of data since we want accurate real-time gas prices
        # We'll only use cache in case of API errors

        try:
            params = {
                "module": "gastracker",
                "action": "gasoracle",
                "apikey": self.api_key
            }

            response = self.session.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

            if data["status"] != "1" or "result" not in data:
                error_msg = data.get('message', 'Unknown error')
                print(f"Etherscan API error: {error_msg}")
                print(f"Full response: {data}")
                raise ValueError(
                    f"Invalid response from Etherscan: {error_msg}")

            result = data["result"]
            if not result or not all(key in result for key in ["SafeGasPrice", "ProposeGasPrice", "FastGasPrice"]):
                print(f"Unexpected response format: {result}")
                raise ValueError("Missing gas price data in response")

            # Parse values carefully, properly handling edge cases like "0" or "<1"
            def parse_gas_price(price_str):
                try:
                    # Handle "<1" or similar text values
                    if isinstance(price_str, str) and not price_str.isdigit():
                        if "<" in price_str:
                            # Return actual value for values less than 1
                            return float(price_str.replace("<", ""))
                        # Try to extract numeric part if possible
                        numeric_part = ''.join(
                            c for c in price_str if c.isdigit() or c == '.')
                        if numeric_part:
                            return float(numeric_part)
                        return 0  # Fallback to 0 if extraction fails

                    # Normal numeric processing - preserve decimal precision
                    return float(price_str)  # Preserve decimal values
                except (ValueError, TypeError):
                    return 0  # Default to 0 Gwei if parsing fails

            # Store as floats with 3 decimal places precision
            gas_prices = {
                "low": round(parse_gas_price(result["SafeGasPrice"]), 3),
                "standard": round(parse_gas_price(result["ProposeGasPrice"]), 3),
                "fast": round(parse_gas_price(result["FastGasPrice"]), 3)
            }

            # Log the raw and processed values for debugging
            print(
                f"DEBUG: Raw Etherscan gas prices - SafeGasPrice: {result['SafeGasPrice']}, ProposeGasPrice: {result['ProposeGasPrice']}, FastGasPrice: {result['FastGasPrice']}")
            print(
                f"DEBUG: Processed gas prices - low: {gas_prices['low']}, standard: {gas_prices['standard']}, fast: {gas_prices['fast']}")

            # Ensure values are all strings to preserve decimal precision when serialized to JSON
            # This prevents JSON serialization from converting small floats to scientific notation
            gas_prices_serializable = {
                "low": str(gas_prices["low"]),
                "standard": str(gas_prices["standard"]),
                "fast": str(gas_prices["fast"])
            }

            # Cache the results for fallback
            self._gas_cache = {
                "timestamp": current_time,
                "data": gas_prices_serializable
            }

            return gas_prices_serializable

        except requests.exceptions.RequestException as e:
            print(f"Network error while fetching gas prices: {str(e)}")
            return self._gas_cache["data"] if self._gas_cache["data"] else None
        except Exception as e:
            print(f"Unexpected error fetching gas prices: {str(e)}")
            return self._gas_cache["data"] if self._gas_cache["data"] else None
