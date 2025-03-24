"""
Alternative.me API client for fetching Crypto Fear & Greed Index.

This module provides a clean interface to the Alternative.me API,
focusing on the Fear & Greed Index which indicates market sentiment.
"""

import time
from typing import Dict

import requests


class FearGreedClient:
    """Client for fetching Fear & Greed Index data."""

    def __init__(self):
        """Initialize the Fear & Greed client."""
        self.base_url = "https://api.alternative.me/fng/"
        self.session = requests.Session()
        self._cache = {"timestamp": 0, "data": None}
        self.cache_duration = 12 * 3600  # Cache for 12 hours

    def get_fear_greed_index(self) -> Dict[str, str]:
        """
        Get current Fear & Greed Index value and classification.

        Returns:
            Dictionary containing fear_greed_value and fear_greed_sentiment
        """
        current_time = time.time()

        # Return cached data if still valid
        if current_time - self._cache["timestamp"] < self.cache_duration and self._cache["data"]:
            return self._cache["data"]

        try:
            response = self.session.get(f"{self.base_url}?limit=1")
            response.raise_for_status()
            data = response.json()

            if "data" not in data or not data["data"]:
                raise ValueError("Invalid response from Fear & Greed API")

            value = data["data"][0]["value"]
            classification = data["data"][0]["value_classification"].lower()

            # Map sentiment to bullish/bearish
            sentiment = "bullish" if int(value) > 50 else "bearish"

            result = {
                "fear_greed_value": value,
                "fear_greed_sentiment": sentiment
            }

            # Cache the results
            self._cache = {
                "timestamp": current_time,
                "data": result
            }

            return result

        except Exception as e:
            print(f"Error fetching Fear & Greed Index: {str(e)}")
            if self._cache["data"]:
                return self._cache["data"]
            return {
                "fear_greed_value": "50",  # Neutral value
                "fear_greed_sentiment": "neutral"
            }
