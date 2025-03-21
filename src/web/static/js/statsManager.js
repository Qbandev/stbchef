// Statistics management functions for Simple Crypto Trading Bot Chef

/**
 * Update model statistics with provided data
 * @param {Object} stats - Statistics data for models
 */
function updateModelStats(stats) {
    // If no wallet is connected, don't update model stats
    if (!window.userAccount) {
        displayEmptyStats();
        return;
    }
    
    // Update detailed stats for each model
    ['gemini', 'groq', 'mistral'].forEach(model => {
        const trades = window.tradeHistory[model];
        const statsContainer = document.getElementById(`${model}-stats`);
        if (statsContainer) {
            const totalTrades = trades.length;
            const correctTrades = trades.filter(t => t.profitable).length;
            const incorrectTrades = totalTrades - correctTrades;

            // Calculate decision distribution
            const decisions = {
                buy: trades.filter(t => t.decision === 'BUY').length,
                sell: trades.filter(t => t.decision === 'SELL').length,
                hold: trades.filter(t => t.decision === 'HOLD').length
            };

            // Calculate average price change for correct trades
            const correctTradesAvgChange = correctTrades > 0 
                ? (trades.filter(t => t.profitable)
                    .reduce((sum, t) => sum + t.priceChange, 0) / correctTrades).toFixed(2)
                : 0;

            statsContainer.innerHTML = `
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <div class="text-gray-400">Total Trades:</div>
                        <div class="font-bold text-cyber-text">${totalTrades}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">Correct Trades:</div>
                        <div class="font-bold text-green-400">${correctTrades}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">Incorrect Trades:</div>
                        <div class="font-bold text-red-400">${incorrectTrades}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">Avg Profit Trades:</div>
                        <div class="font-bold ${parseFloat(correctTradesAvgChange) >= 0 ? 'text-green-400' : 'text-red-400'}">
                            ${correctTradesAvgChange}%
                        </div>
                    </div>
                    <div class="col-span-2">
                        <div class="text-gray-400">Decision Distribution:</div>
                        <div class="flex justify-between mt-1">
                            <span class="text-green-400">Buy: ${decisions.buy}</span>
                            <span class="text-red-400">Sell: ${decisions.sell}</span>
                            <span class="text-blue-400">Hold: ${decisions.hold}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    });
}

/**
 * Update model stats display with latest data
 */
function updateModelStatsDisplay() {
    // Check if we need to reset daily stats
    checkDailyReset();

    // If wallet is connected, fetch wallet-specific stats
    if (window.userAccount) {
        fetchWalletStats();
        return;
    }

    // If no wallet connected, display default state with connect wallet message
    displayEmptyStats();
}

/**
 * Display empty stats for all models when no wallet is connected
 */
function displayEmptyStats() {
    ['gemini', 'groq', 'mistral'].forEach(model => {
        const statsContainer = document.getElementById(`${model}-stats`);
        const accuracyElement = document.getElementById(`${model}-accuracy`);
        const rawAccuracyElement = document.getElementById(`${model}-raw-accuracy`);
        
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="text-center py-2">
                    <p class="text-gray-400 mb-2">Connect your wallet to see model performance.</p>
                    <button onclick="connectWallet()" class="cyber-btn text-xs px-3 py-1">Connect Wallet</button>
                </div>
            `;
        }
        
        if (accuracyElement) {
            accuracyElement.textContent = '0.0%';
            accuracyElement.className = 'font-bold text-gray-400';
        }

        // Also reset the raw accuracy element
        if (rawAccuracyElement) {
            rawAccuracyElement.textContent = '0.0%';
            rawAccuracyElement.className = 'font-bold text-xs text-gray-400';
        }
    });
}

/**
 * Fetch wallet-specific stats from API
 * @returns {Promise} - Promise resolving to the wallet stats data
 */
function fetchWalletStats() {
    if (!window.userAccount) {
        console.log('No wallet connected - skipping wallet stats fetch');
        return Promise.resolve('not_applicable'); // Return a resolved promise to prevent catch errors
    }
    
    return fetch(`/api/wallet-stats?wallet_address=${window.userAccount}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch wallet stats');
            }
            return response.json();
        })
        .then(data => {
            updateWalletModelStats(data);
            return data;
        })
        .catch(error => {
            console.error('Error fetching wallet stats:', error);
            // Show error in stats containers
            ['gemini', 'groq', 'mistral'].forEach(model => {
                const statsContainer = document.getElementById(`${model}-stats`);
                if (statsContainer) {
                    statsContainer.innerHTML = `
                        <div class="text-center py-2">
                            <p class="text-red-400">Error loading stats: ${error.message}</p>
                        </div>
                    `;
                }
            });
            throw error; // Re-throw the error to propagate it
        });
}

/**
 * Update model stats with wallet-specific data
 * @param {Object} walletData - Wallet-specific model performance data
 */
function updateWalletModelStats(walletData) {
    // Extract action distribution and statistics
    const actionDistribution = walletData.statistics?.action_distribution || { BUY: 0, SELL: 0, HOLD: 0 };
    const totalActions = walletData.statistics?.total_actions || 0;
    const profitableActions = walletData.statistics?.profitable_actions || 0;
    const accuracy = walletData.statistics?.accuracy || 0;
    const rawAccuracy = walletData.statistics?.raw_accuracy || 0;
    const valueChange = walletData.statistics?.total_value_change || 0;
    
    // Get model-specific stats
    const modelStats = walletData.model_stats || {};
    
    // Update each model's stats container
    ['gemini', 'groq', 'mistral'].forEach(model => {
        const statsContainer = document.getElementById(`${model}-stats`);
        const accuracyElement = document.getElementById(`${model}-accuracy`);
        const rawAccuracyElement = document.getElementById(`${model}-raw-accuracy`);
        
        const modelStat = modelStats[model] || {
            total_decisions: 0,
            correct_decisions: 0,
            accuracy: 0,
            raw_accuracy: 0,
            decision_counts: { BUY: 0, SELL: 0, HOLD: 0 }
        };
        
        if (statsContainer) {
            if (modelStat.total_decisions > 0) {
                statsContainer.innerHTML = `
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="col-span-2 mb-1">
                            <div class="text-xs font-bold text-neon-blue">Your Wallet Activity</div>
                        </div>
                        <div>
                            <div class="text-gray-400">Total Decisions:</div>
                            <div class="font-bold text-cyber-text">${modelStat.total_decisions}</div>
                        </div>
                        <div>
                            <div class="text-gray-400">Correct Decisions:</div>
                            <div class="font-bold text-green-400">${modelStat.correct_decisions}</div>
                        </div>
                        <div>
                            <div class="text-gray-400">Incorrect Decisions:</div>
                            <div class="font-bold text-red-400">${modelStat.total_decisions - modelStat.correct_decisions}</div>
                        </div>
                        <div>
                            <div class="text-gray-400">Raw Accuracy:</div>
                            <div class="font-bold ${modelStat.raw_accuracy >= 65 ? 'text-green-400' : modelStat.raw_accuracy >= 45 ? 'text-yellow-400' : 'text-red-400'}">
                                ${modelStat.raw_accuracy.toFixed(1)}%
                            </div>
                        </div>
                        <div class="col-span-2">
                            <div class="text-gray-400">Decision Distribution:</div>
                            <div class="flex justify-between mt-1">
                                <span class="text-green-400">Buy: ${modelStat.decision_counts.BUY}</span>
                                <span class="text-red-400">Sell: ${modelStat.decision_counts.SELL}</span>
                                <span class="text-blue-400">Hold: ${modelStat.decision_counts.HOLD}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                statsContainer.innerHTML = `
                    <div class="text-center py-2">
                        <p class="text-gray-400 mb-2">No trading activity yet for this wallet.</p>
                    </div>
                `;
            }
        }
        
        if (accuracyElement) {
            accuracyElement.textContent = `${modelStat.accuracy.toFixed(1)}%`;
            accuracyElement.className = `font-bold ${
                modelStat.accuracy >= 65 ? 'text-green-400' :
                modelStat.accuracy >= 45 ? 'text-yellow-400' :
                'text-red-400'
            }`;
        }
        
        if (rawAccuracyElement) {
            rawAccuracyElement.textContent = `${modelStat.raw_accuracy.toFixed(1)}%`;
            rawAccuracyElement.className = `font-bold text-xs ${
                modelStat.raw_accuracy >= 65 ? 'text-green-400' :
                modelStat.raw_accuracy >= 45 ? 'text-yellow-400' :
                'text-red-400'
            }`;
        }
    });
}

/**
 * Update model stats with selected timeframe data
 * @param {string} timeframe - Timeframe to fetch stats for (e.g., '24h', '7d', '30d')
 */
function updateTimeframe(timeframe) {
    // Update button styles
    document.querySelectorAll('.cyber-btn').forEach(btn => {
        btn.classList.remove('cyber-btn-active');
    });
    event.target.classList.add('cyber-btn-active');

    // Fetch new data with selected timeframe
    fetch(`/api/model-stats?timeframe=${timeframe}`)
        .then(response => response.json())
        .then(data => {
            if (data.performance) {
                updateModelStats(data.performance);
            }
            if (data.comparison) {
                updateModelStats(data.comparison);
            }
        })
        .catch(error => console.error('Error updating timeframe:', error));
}

/**
 * Filter trades from the last 24 hours
 * @param {Array} trades - List of trades to filter
 * @returns {Array} - Filtered list of trades
 */
function getRecentTrades(trades) {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    return trades.filter(trade => new Date(trade.timestamp) > oneDayAgo);
}

/**
 * Check if daily stats need to be reset
 * @returns {boolean} - True if stats were reset, false otherwise
 */
function checkDailyReset() {
    const lastReset = localStorage.getItem('last_daily_reset');
    const now = new Date();
    const today = now.toDateString();

    if (lastReset !== today) {
        // Reset daily stats for each model
        ['gemini', 'groq', 'mistral'].forEach(model => {
            // We don't actually delete trades, just mark when we last reset
            console.log(`Resetting daily stats for ${model}`);
        });

        // Store today's date as the last reset day
        localStorage.setItem('last_daily_reset', today);
        return true;
    }
    return false;
}

// Make functions available globally
window.updateModelStats = updateModelStats;
window.updateModelStatsDisplay = updateModelStatsDisplay;
window.displayEmptyStats = displayEmptyStats;
window.fetchWalletStats = fetchWalletStats;
window.updateWalletModelStats = updateWalletModelStats;
window.updateTimeframe = updateTimeframe;
window.getRecentTrades = getRecentTrades;
window.checkDailyReset = checkDailyReset;

/**
 * Fetch latest market data and update the UI
 */
function updateData() {
    console.log('Fetching new data...');
    fetch('/api/trading-data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);

            // Validate ETH price first
            const hasValidPrice = data.eth_price && !isNaN(parseFloat(data.eth_price)) && parseFloat(data.eth_price) > 0;

            // Update metrics with proper error handling
            try {
                // Check if we have valid price data
                if (hasValidPrice) {
                    document.getElementById('eth-price').textContent = `$${parseFloat(data.eth_price).toFixed(2)}`;
                    document.getElementById('eth-volume').textContent = `$${(parseFloat(data.eth_volume_24h || 0)/1e6).toFixed(2)}M`;
                    document.getElementById('eth-high').textContent = `$${parseFloat(data.eth_high_24h || 0).toFixed(2)}`;
                    document.getElementById('eth-low').textContent = `$${parseFloat(data.eth_low_24h || 0).toFixed(2)}`;
                } else {
                    document.getElementById('eth-price').textContent = `Waiting for data...`;
                    document.getElementById('eth-volume').textContent = `Waiting for data...`;
                    document.getElementById('eth-high').textContent = `Waiting for data...`;
                    document.getElementById('eth-low').textContent = `Waiting for data...`;
                }
            } catch (error) {
                console.error('Error updating price metrics:', error);
                document.getElementById('eth-price').textContent = `Error`;
                document.getElementById('eth-volume').textContent = `Error`;
                document.getElementById('eth-high').textContent = `Error`;
                document.getElementById('eth-low').textContent = `Error`;
            }

            // Update model decisions with error handling
            try {
                updateModelDecisions(data, window.userAccount);
            } catch (error) {
                console.error('Error updating model decisions:', error);
            }

            // Update gas price information with error handling
            try {
                if (data.gas_prices && 
                    data.gas_prices.low !== undefined && 
                    data.gas_prices.standard !== undefined && 
                    data.gas_prices.fast !== undefined) {
                    document.getElementById('gas-low').textContent = `${data.gas_prices.low} Gwei`;
                    document.getElementById('gas-standard').textContent = `${data.gas_prices.standard} Gwei`;
                    document.getElementById('gas-fast').textContent = `${data.gas_prices.fast} Gwei`;
                } else {
                    document.getElementById('gas-low').textContent = `Waiting for data...`;
                    document.getElementById('gas-standard').textContent = `Waiting for data...`;
                    document.getElementById('gas-fast').textContent = `Waiting for data...`;
                }
            } catch (error) {
                console.error('Error updating gas prices:', error);
                document.getElementById('gas-low').textContent = `Error`;
                document.getElementById('gas-standard').textContent = `Error`;
                document.getElementById('gas-fast').textContent = `Error`;
            }
            
            // Update market sentiment with error handling
            try {
                const sentimentText = document.getElementById('sentiment');
                if (sentimentText && data.market_sentiment && 
                    data.market_sentiment.fear_greed_value && 
                    data.market_sentiment.fear_greed_sentiment) {
                    sentimentText.textContent = `${data.market_sentiment.fear_greed_value} (${data.market_sentiment.fear_greed_sentiment})`;
                    const sentimentClass = data.market_sentiment.fear_greed_sentiment === 'bullish'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800';

                    sentimentText.className = `px-2 py-1 rounded-full text-sm font-semibold ${sentimentClass}`;
                } else if (sentimentText) {
                    sentimentText.textContent = `-`;
                    sentimentText.className = `px-2 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800`;
                }
            } catch (error) {
                console.error('Error updating market sentiment:', error);
                const sentimentText = document.getElementById('sentiment');
                if (sentimentText) {
                    sentimentText.textContent = `Error`;
                    sentimentText.className = `px-2 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800`;
                }
            }

            // Update charts with error handling
            try {
                if (hasValidPrice) {
                    window.updateCharts(
                        parseFloat(data.eth_price),
                        data.market_sentiment?.fear_greed_value,
                        data.gemini_action,
                        data.groq_action,
                        data.mistral_action,
                        parseFloat(data.eth_volume_24h || 0)
                    );
                }
            } catch (error) {
                console.error('Error updating charts:', error);
            }

            // Only update model stats if wallet is connected
            try {
                if (window.userAccount && hasValidPrice && data.model_stats?.comparison) {
                    // Get wallet-specific stats instead of general stats
                    fetchWalletStats();
                } else {
                    // Make sure model cards show connect wallet message
                    displayEmptyStats();
                }
            } catch (error) {
                console.error('Error updating model stats:', error);
                displayEmptyStats();
            }

            // Only persist trading history if wallet is connected
            try {
                if (window.userAccount && hasValidPrice) {
                    window.persistTradingHistory();
                }
            } catch (error) {
                console.error('Error persisting trading history:', error);
            }
        })
        .catch(error => {
            console.error('Failed to fetch market data:', error);
            document.querySelectorAll('.cyber-value').forEach(el => {
                el.textContent = 'Error';
                el.classList.add('text-red-500');
            });
        });

    // If we have a wallet but no valid price, update wallet card
    if (window.userAccount && !window.hasValidPrice) {
        window.updateWalletCard();
    }
}

// Make updateData available globally
window.updateData = updateData;

/**
 * Check if this is a fresh session and clear storage if needed
 */
function checkFreshSession() {
    const lastVisit = localStorage.getItem('stbchef_last_visit');
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    // If this is first visit or last visit was more than a day ago
    if (!lastVisit || (now - parseInt(lastVisit)) > oneDayInMs) {
        console.log("Fresh session detected, clearing storage");
        
        // Call backend clear-storage endpoint
        fetch('/clear-storage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log("Storage cleared response:", data);
            
            // Clear all local storage items related to the app
            Object.values(window.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Also clear raw accuracy data
            localStorage.removeItem('stbchef_raw_accuracy');
            
            // Reset trade history variables
            window.tradeHistory = {
                gemini: [],
                groq: [],
                mistral: []
            };
            
            // Reset raw accuracy tracking
            window.aiRawAccuracy = {
                gemini: { correct: 0, total: 0, accuracy: 0 },
                groq: { correct: 0, total: 0, accuracy: 0 },
                mistral: { correct: 0, total: 0, accuracy: 0 }
            };
            
            // Set all accuracy elements to 0
            ['gemini', 'groq', 'mistral'].forEach(model => {
                const accuracyElement = document.getElementById(`${model}-accuracy`);
                if (accuracyElement) {
                    accuracyElement.textContent = '0.0%';
                    accuracyElement.className = 'font-bold text-gray-400';
                }
                
                const rawAccuracyElement = document.getElementById(`${model}-raw-accuracy`);
                if (rawAccuracyElement) {
                    rawAccuracyElement.textContent = '0.0%';
                    rawAccuracyElement.className = 'font-bold text-xs text-gray-400';
                }
            });
        })
        .catch(error => console.error("Error clearing storage:", error));
    }
    
    // Update last visit timestamp
    localStorage.setItem('stbchef_last_visit', now.toString());
}

// Make checkFreshSession available globally
window.checkFreshSession = checkFreshSession; 