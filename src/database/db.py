"""Database module for storing trading data."""

import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging


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

            # Create AI decisions table - add wallet_address column
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_decisions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    model TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    eth_price REAL NOT NULL,
                    was_correct BOOLEAN,
                    profit_loss REAL,
                    wallet_address TEXT,
                    FOREIGN KEY (timestamp) REFERENCES market_data (timestamp)
                )
            """)

            # Check if wallet_address column exists in ai_decisions, add it if not
            try:
                cursor.execute(
                    "SELECT wallet_address FROM ai_decisions LIMIT 1")
            except sqlite3.OperationalError:
                # Column doesn't exist, add it
                cursor.execute(
                    "ALTER TABLE ai_decisions ADD COLUMN wallet_address TEXT")
                logging.info(
                    "Added wallet_address column to ai_decisions table")

            # Create wallet actions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS wallet_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    wallet_address TEXT NOT NULL,
                    action TEXT NOT NULL,
                    eth_balance REAL NOT NULL,
                    usdc_balance REAL NOT NULL,
                    eth_allocation REAL NOT NULL,
                    eth_price REAL NOT NULL,
                    network TEXT NOT NULL
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
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_decisions_wallet_address 
                ON ai_decisions(wallet_address)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_wallet_actions_wallet_address 
                ON wallet_actions(wallet_address)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_wallet_actions_timestamp 
                ON wallet_actions(timestamp)
            """)

            conn.commit()

    def _optimize_db(self) -> None:
        """Optimize database settings for better performance."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Faster writes with reasonable safety
            cursor.execute("PRAGMA synchronous=NORMAL")
            # Store temp tables in memory
            cursor.execute("PRAGMA temp_store=MEMORY")
            # Use 2MB of memory for cache
            cursor.execute("PRAGMA cache_size=-2000")

            # Create pragma_stats table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pragma_stats (
                    name TEXT PRIMARY KEY,
                    value TEXT
                )
            """)

            # Get last vacuum time
            cursor.execute(
                "SELECT value FROM pragma_stats WHERE name='last_vacuum'")
            last_vacuum = cursor.fetchone()

            # Run VACUUM if:
            # 1. Last vacuum was more than 24 hours ago
            # 2. Or if last vacuum time is not recorded
            should_vacuum = (
                not last_vacuum or
                (datetime.now() -
                 datetime.fromisoformat(last_vacuum[0])).total_seconds() > 24 * 3600
            )

            if should_vacuum:
                cursor.execute("VACUUM")  # Compact the database file
                # Record vacuum time
                cursor.execute("""
                    INSERT OR REPLACE INTO pragma_stats (name, value)
                    VALUES ('last_vacuum', ?)
                """, (datetime.now().isoformat(),))

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
        eth_price: float,
        wallet_address: str
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
                    profit_loss,
                    wallet_address
                ) VALUES (?, ?, ?, ?, NULL, NULL, ?)
            """, (
                datetime.now(),
                model,
                decision,
                eth_price,
                wallet_address
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
        """Clean up old data to prevent database bloat, keeping last 24 hours of trading data."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get stats for the last 24 hours before flushing
            daily_stats = {}
            for model in ['gemini', 'groq', 'mistral']:
                # Get total trades in last 24 hours
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_trades,
                        SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) as correct_trades,
                        SUM(CASE WHEN decision = 'BUY' THEN 1 ELSE 0 END) as buy_decisions,
                        SUM(CASE WHEN decision = 'SELL' THEN 1 ELSE 0 END) as sell_decisions,
                        SUM(CASE WHEN decision = 'HOLD' THEN 1 ELSE 0 END) as hold_decisions,
                        AVG(CASE WHEN was_correct = 1 THEN profit_loss ELSE 0 END) as avg_profit
                    FROM ai_decisions 
                    WHERE model = ? AND timestamp >= datetime('now', '-24 hours')
                """, (model,))
                result = cursor.fetchone()

                if result:
                    daily_stats[model] = {
                        'total_trades': result['total_trades'],
                        'correct_trades': result['correct_trades'] or 0,
                        'incorrect_trades': result['total_trades'] - (result['correct_trades'] or 0),
                        'buy_decisions': result['buy_decisions'] or 0,
                        'sell_decisions': result['sell_decisions'] or 0,
                        'hold_decisions': result['hold_decisions'] or 0,
                        'avg_profit': result['avg_profit'] or 0
                    }

            # Store the daily stats in a separate table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS daily_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    model TEXT NOT NULL,
                    total_trades INTEGER NOT NULL,
                    correct_trades INTEGER NOT NULL,
                    incorrect_trades INTEGER NOT NULL,
                    buy_decisions INTEGER NOT NULL,
                    sell_decisions INTEGER NOT NULL,
                    hold_decisions INTEGER NOT NULL,
                    avg_profit REAL NOT NULL
                )
            """)

            today = datetime.now().strftime('%Y-%m-%d')

            # Delete existing stats for today to avoid duplicates
            cursor.execute("DELETE FROM daily_stats WHERE date = ?", (today,))

            # Store new stats for each model
            for model, stats in daily_stats.items():
                cursor.execute("""
                    INSERT INTO daily_stats (
                        date, model, total_trades, correct_trades, incorrect_trades,
                        buy_decisions, sell_decisions, hold_decisions, avg_profit
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    today,
                    model,
                    stats['total_trades'],
                    stats['correct_trades'],
                    stats['incorrect_trades'],
                    stats['buy_decisions'],
                    stats['sell_decisions'],
                    stats['hold_decisions'],
                    stats['avg_profit']
                ))

            # Keep only last 7 days of daily stats
            cursor.execute("""
                DELETE FROM daily_stats 
                WHERE date < date('now', '-7 days')
            """)

            # Keep only last 24 hours of raw market data and decisions
            cursor.execute("""
                DELETE FROM market_data 
                WHERE timestamp < datetime('now', '-24 hours')
            """)
            cursor.execute("""
                DELETE FROM ai_decisions 
                WHERE timestamp < datetime('now', '-24 hours')
            """)

            conn.commit()

    def get_daily_stats(self, days: int = 7) -> Dict[str, List[Dict]]:
        """Get the stored daily stats for the specified number of days."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("""
                SELECT * FROM daily_stats
                WHERE date >= date('now', ? || ' days')
                ORDER BY date DESC
            """, (f'-{days}',))

            results = cursor.fetchall()
            stats = {}

            # Make sure we have entries for all models
            for model in ['gemini', 'groq', 'mistral']:
                stats[model] = []

            # Process the results if we have any
            for row in results:
                model = row['model']
                if model not in stats:
                    stats[model] = []

                stats[model].append({
                    'date': row['date'],
                    'total_trades': row['total_trades'],
                    'correct_trades': row['correct_trades'],
                    'incorrect_trades': row['incorrect_trades'],
                    'buy_decisions': row['buy_decisions'],
                    'sell_decisions': row['sell_decisions'],
                    'hold_decisions': row['hold_decisions'],
                    'avg_profit': row['avg_profit']
                })

            # If we don't have any stats for today, add default empty entry
            today = datetime.now().strftime('%Y-%m-%d')
            for model in ['gemini', 'groq', 'mistral']:
                if not stats[model] or stats[model][0]['date'] != today:
                    stats[model].insert(0, {
                        'date': today,
                        'total_trades': 0,
                        'correct_trades': 0,
                        'incorrect_trades': 0,
                        'buy_decisions': 0,
                        'sell_decisions': 0,
                        'hold_decisions': 0,
                        'avg_profit': 0.0
                    })

            return stats

    def store_wallet_action(
        self,
        wallet_address: str,
        action: str,
        eth_balance: float,
        usdc_balance: float,
        eth_allocation: float,
        network: str = "unknown"
    ) -> None:
        """Store wallet action in database."""
        # Get current ETH price
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT eth_price 
                FROM market_data 
                ORDER BY timestamp DESC 
                LIMIT 1
            """)
            result = cursor.fetchone()
            if not result:
                logging.warning(
                    "No market data available. Cannot store wallet action.")
                raise ValueError("No market data available.")
            eth_price = result[0]

            # Store wallet action
            cursor.execute("""
                INSERT INTO wallet_actions (
                    timestamp,
                    wallet_address,
                    action,
                    eth_balance,
                    usdc_balance,
                    eth_allocation,
                    eth_price,
                    network
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now(),
                wallet_address,
                action,
                eth_balance,
                usdc_balance,
                eth_allocation,
                eth_price,
                network
            ))
            conn.commit()

    def get_wallet_stats(self, wallet_address: str) -> Dict[str, Dict[str, float]]:
        """Get statistics for a specific wallet."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get recent wallet actions
            cursor.execute("""
                SELECT 
                    action,
                    timestamp,
                    eth_price,
                    eth_balance,
                    usdc_balance,
                    eth_allocation
                FROM wallet_actions
                WHERE wallet_address = ?
                ORDER BY timestamp DESC
                LIMIT 100
            """, (wallet_address,))

            actions = []
            for row in cursor.fetchall():
                actions.append({
                    'action': row['action'],
                    'timestamp': row['timestamp'],
                    'eth_price': row['eth_price'],
                    'eth_balance': row['eth_balance'],
                    'usdc_balance': row['usdc_balance'],
                    'eth_allocation': row['eth_allocation']
                })

            # Also get AI decisions specific to this wallet
            cursor.execute("""
                SELECT 
                    model,
                    decision,
                    timestamp,
                    eth_price,
                    was_correct,
                    profit_loss
                FROM ai_decisions
                WHERE wallet_address = ? OR wallet_address = 'global'
                ORDER BY timestamp DESC
                LIMIT 100
            """, (wallet_address,))

            ai_decisions = []
            for row in cursor.fetchall():
                ai_decisions.append({
                    'model': row['model'],
                    'decision': row['decision'],
                    'timestamp': row['timestamp'],
                    'eth_price': row['eth_price'],
                    'was_correct': row['was_correct'],
                    'profit_loss': row['profit_loss']
                })

            # Calculate performance metrics
            # For simplicity, just counting actions for now
            action_counts = {
                'BUY': 0,
                'SELL': 0,
                'HOLD': 0
            }

            total_value_change = 0
            previous_price = 0
            profitable_actions = 0

            for i, action in enumerate(actions):
                action_counts[action['action']] += 1

                # Skip first action for value change calculation
                if i > 0 and previous_price > 0:
                    price_change = action['eth_price'] - previous_price

                    # If action was BUY and price went up, or SELL and price went down, it was profitable
                    was_profitable = (action['action'] == 'BUY' and price_change > 0) or \
                                     (action['action'] ==
                                      'SELL' and price_change < 0)

                    if was_profitable:
                        profitable_actions += 1

                    # Calculate value change based on action and price movement
                    if action['action'] == 'BUY':
                        # Calculate how much ETH could have been bought with fixed USD
                        eth_amount = 1000 / previous_price  # Assuming $1000 investment
                        new_value = eth_amount * action['eth_price']
                        value_change = new_value - 1000
                    elif action['action'] == 'SELL':
                        # Calculate how much USD would be from selling fixed ETH
                        eth_amount = 1  # Assuming 1 ETH sale
                        old_value = eth_amount * previous_price
                        new_value = eth_amount * action['eth_price']
                        value_change = old_value - new_value
                    else:  # HOLD
                        value_change = 0

                    total_value_change += value_change

                previous_price = action['eth_price']

            # Calculate total actions and accuracy
            total_actions = sum(action_counts.values())
            accuracy = (profitable_actions / total_actions *
                        100) if total_actions > 0 else 0

            # Calculate model-specific statistics
            model_stats = {}
            for model in ['gemini', 'groq', 'mistral']:
                model_decisions = [
                    d for d in ai_decisions if d['model'] == model]
                total_model_decisions = len(model_decisions)

                # Count decision types
                model_decision_counts = {
                    'BUY': len([d for d in model_decisions if d['decision'] == 'BUY']),
                    'SELL': len([d for d in model_decisions if d['decision'] == 'SELL']),
                    'HOLD': len([d for d in model_decisions if d['decision'] == 'HOLD'])
                }

                # Calculate correct decisions
                correct_decisions = len(
                    [d for d in model_decisions if d['was_correct']])

                model_stats[model] = {
                    'total_decisions': total_model_decisions,
                    'correct_decisions': correct_decisions,
                    'accuracy': round((correct_decisions / total_model_decisions * 100) if total_model_decisions > 0 else 0, 1),
                    'decision_counts': model_decision_counts
                }

            return {
                'wallet_address': wallet_address,
                'actions': actions,
                'ai_decisions': ai_decisions,
                'model_stats': model_stats,
                'statistics': {
                    'total_actions': total_actions,
                    'action_distribution': action_counts,
                    'profitable_actions': profitable_actions,
                    'accuracy': round(accuracy, 1),
                    'total_value_change': round(total_value_change, 2),
                    'current_eth_balance': actions[0]['eth_balance'] if actions else 0,
                    'current_usdc_balance': actions[0]['usdc_balance'] if actions else 0,
                    'current_allocation': actions[0]['eth_allocation'] if actions else 0
                }
            }
