"""Database module for storing trading data."""

import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


class TradingDatabase:
    """SQLite database for storing trading data."""

    def __init__(self, db_path: str = "trading_data.db"):
        """Initialize database connection."""
        self.db_path = db_path
        self._init_db()
        self._optimize_db()  # Add optimization on init

    def _init_db(self) -> None:
        """Initialize database tables."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Create market data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS market_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    eth_price REAL NOT NULL,
                    eth_volume_24h REAL NOT NULL,
                    eth_high_24h REAL NOT NULL,
                    eth_low_24h REAL NOT NULL,
                    gas_price_low INTEGER,
                    gas_price_standard INTEGER,
                    gas_price_fast INTEGER,
                    fear_greed_value TEXT,
                    fear_greed_sentiment TEXT
                )
            """)

            # Create AI decisions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_decisions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    model TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    eth_price REAL NOT NULL,
                    was_correct BOOLEAN,
                    profit_loss REAL,
                    FOREIGN KEY (timestamp) REFERENCES market_data (timestamp)
                )
            """)

            # Create indices for better query performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_market_data_timestamp 
                ON market_data(timestamp)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_decisions_timestamp 
                ON ai_decisions(timestamp)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_decisions_model 
                ON ai_decisions(model)
            """)

            conn.commit()

    def _optimize_db(self) -> None:
        """Optimize database performance and size."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Write-Ahead Logging for better concurrency
            cursor.execute("PRAGMA journal_mode=WAL")
            # Faster writes with reasonable safety
            cursor.execute("PRAGMA synchronous=NORMAL")
            # Store temp tables in memory
            cursor.execute("PRAGMA temp_store=MEMORY")
            # Use 2MB of memory for cache
            cursor.execute("PRAGMA cache_size=-2000")
            cursor.execute("VACUUM")  # Compact the database file
            conn.commit()

    def store_market_data(
        self,
        eth_price: float,
        eth_volume: float,
        eth_high: float,
        eth_low: float,
        gas_prices: Optional[Dict[str, int]],
        market_sentiment: Dict[str, str]
    ) -> None:
        """Store market data in database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO market_data (
                    timestamp,
                    eth_price,
                    eth_volume_24h,
                    eth_high_24h,
                    eth_low_24h,
                    gas_price_low,
                    gas_price_standard,
                    gas_price_fast,
                    fear_greed_value,
                    fear_greed_sentiment
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now(),
                eth_price,
                eth_volume,
                eth_high,
                eth_low,
                gas_prices['low'] if gas_prices else None,
                gas_prices['standard'] if gas_prices else None,
                gas_prices['fast'] if gas_prices else None,
                market_sentiment['fear_greed_value'],
                market_sentiment['fear_greed_sentiment']
            ))
            conn.commit()

    def store_ai_decision(
        self,
        model: str,
        decision: str,
        eth_price: float
    ) -> None:
        """Store AI trading decision in database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ai_decisions (
                    timestamp,
                    model,
                    decision,
                    eth_price,
                    was_correct,
                    profit_loss
                ) VALUES (?, ?, ?, ?, NULL, NULL)
            """, (
                datetime.now(),
                model,
                decision,
                eth_price
            ))
            conn.commit()

    def update_decision_accuracy(self, current_price: float) -> None:
        """Update accuracy of previous decisions based on current price."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get last unchecked decisions
            cursor.execute("""
                SELECT id, decision, eth_price
                FROM ai_decisions
                WHERE was_correct IS NULL
                AND timestamp < datetime('now', '-30 seconds')
            """)

            decisions = cursor.fetchall()
            for decision_id, decision, price in decisions:
                price_change = current_price - price
                price_change_pct = (price_change / price) * 100
                is_correct = None
                profit_loss = None

                if decision == 'BUY':
                    is_correct = price_change > 0
                    profit_loss = price_change_pct if is_correct else -price_change_pct
                elif decision == 'SELL':
                    is_correct = price_change < 0
                    profit_loss = -price_change_pct if is_correct else price_change_pct
                elif decision == 'HOLD':
                    is_correct = abs(price_change_pct) < 0.5
                    profit_loss = 0

                cursor.execute("""
                    UPDATE ai_decisions
                    SET was_correct = ?, profit_loss = ?
                    WHERE id = ?
                """, (is_correct, profit_loss, decision_id))

            conn.commit()

    def get_accuracy_stats(self) -> Dict[str, Dict[str, float]]:
        """Get accuracy statistics for each AI model."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    model,
                    COUNT(*) as total,
                    SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) as correct,
                    COALESCE(AVG(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as avg_profit,
                    COALESCE(MIN(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as max_loss,
                    COALESCE(MAX(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as max_profit
                FROM ai_decisions
                WHERE was_correct IS NOT NULL
                AND decision != 'HOLD'
                GROUP BY model
            """)

            stats = {}
            for model, total, correct, avg_profit, max_loss, max_profit in cursor.fetchall():
                accuracy = (correct / total * 100) if total > 0 else 0
                stats[model] = {
                    'total_decisions': total,
                    'correct_decisions': correct,
                    'accuracy': round(accuracy, 1),
                    'avg_profit': round(avg_profit if avg_profit is not None else 0, 2),
                    'max_loss': round(max_loss if max_loss is not None else 0, 2),
                    'max_profit': round(max_profit if max_profit is not None else 0, 2)
                }

            return stats

    def get_recent_market_data(self, limit: int = 100) -> List[Tuple]:
        """Get recent market data for charting."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    timestamp,
                    eth_price,
                    eth_volume_24h,
                    gas_price_low,
                    gas_price_standard,
                    gas_price_fast,
                    fear_greed_value,
                    fear_greed_sentiment
                FROM market_data
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            return cursor.fetchall()

    def get_recent_decisions(self, limit: int = 100) -> List[Tuple]:
        """Get recent AI decisions for charting."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    timestamp,
                    model,
                    decision,
                    eth_price,
                    was_correct,
                    profit_loss
                FROM ai_decisions
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            return cursor.fetchall()

    def get_performance_by_timeframe(self, timeframe: str = 'day') -> Dict[str, Dict[str, float]]:
        """Get AI model performance statistics by timeframe."""
        timeframes = {
            'hour': "strftime('%Y-%m-%d %H', timestamp)",
            'day': "date(timestamp)",
            'week': "strftime('%Y-%W', timestamp)",
            'month': "strftime('%Y-%m', timestamp)"
        }

        if timeframe not in timeframes:
            raise ValueError(
                f"Invalid timeframe. Choose from: {', '.join(timeframes.keys())}")

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT 
                    model,
                    {timeframes[timeframe]} as period,
                    COUNT(*) as decisions,
                    COALESCE(AVG(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) * 100, 0) as accuracy,
                    COALESCE(AVG(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as avg_profit,
                    COALESCE(SUM(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as total_profit
                FROM ai_decisions
                WHERE was_correct IS NOT NULL
                AND decision != 'HOLD'
                GROUP BY model, period
                ORDER BY period DESC, model
            """)

            results = {}
            for model, period, decisions, accuracy, avg_profit, total_profit in cursor.fetchall():
                if model not in results:
                    results[model] = []
                results[model].append({
                    'period': period,
                    'decisions': decisions,
                    'accuracy': round(accuracy if accuracy is not None else 0, 1),
                    'avg_profit': round(avg_profit if avg_profit is not None else 0, 2),
                    'total_profit': round(total_profit if total_profit is not None else 0, 2)
                })

            return results

    def get_model_comparison(self, days: int = 7) -> Dict[str, Dict[str, float]]:
        """Get detailed model comparison statistics."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    model,
                    COUNT(*) as total_decisions,
                    SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) as correct_decisions,
                    AVG(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) * 100 as accuracy,
                    COALESCE(AVG(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as avg_profit,
                    COALESCE(SUM(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as total_profit,
                    COALESCE(MIN(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as max_loss,
                    COALESCE(MAX(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END), 0) as max_profit,
                    COUNT(CASE WHEN decision = 'BUY' THEN 1 END) as buy_count,
                    COUNT(CASE WHEN decision = 'SELL' THEN 1 END) as sell_count,
                    COUNT(CASE WHEN decision = 'HOLD' THEN 1 END) as hold_count
                FROM ai_decisions
                WHERE timestamp > datetime('now', ?)
                GROUP BY model
            """, (f'-{days} days',))

            results = {}
            for row in cursor.fetchall():
                model = row[0]
                results[model] = {
                    'total_decisions': row[1],
                    'correct_decisions': row[2],
                    'accuracy': round(row[3] if row[3] is not None else 0, 1),
                    'avg_profit': round(row[4] if row[4] is not None else 0, 2),
                    'total_profit': round(row[5] if row[5] is not None else 0, 2),
                    'max_loss': round(row[6] if row[6] is not None else 0, 2),
                    'max_profit': round(row[7] if row[7] is not None else 0, 2),
                    'decision_distribution': {
                        'buy': row[8],
                        'sell': row[9],
                        'hold': row[10]
                    }
                }

            return results

    def cleanup_old_data(self) -> None:
        """Clean up old data to prevent database bloat."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Keep only last 7 days of data
            cursor.execute("""
                DELETE FROM market_data 
                WHERE timestamp < datetime('now', '-7 days')
            """)
            cursor.execute("""
                DELETE FROM ai_decisions 
                WHERE timestamp < datetime('now', '-7 days')
            """)
            conn.commit()
