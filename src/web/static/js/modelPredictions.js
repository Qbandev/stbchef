// Model prediction analysis functions for Simple Crypto Trading Bot Chef

/**
 * Get list of models that recommend BUY action
 * @param {Object} decisions - Object containing model decisions
 * @returns {Array} - Array of model names that recommend BUY
 */
function getModelDecisions(decisions) {
    const modelDecisions = [];
    if (decisions.gemini === 'BUY') modelDecisions.push('Gemini');
    if (decisions.groq === 'BUY') modelDecisions.push('Groq');
    if (decisions.mistral === 'BUY') modelDecisions.push('Mistral');
    return modelDecisions;
}

/**
 * Get list of models that recommend SELL action
 * @param {Object} decisions - Object containing model decisions
 * @returns {Array} - Array of model names that recommend SELL
 */
function getModelSellDecisions(decisions) {
    const modelDecisions = [];
    if (decisions.gemini === 'SELL') modelDecisions.push('Gemini');
    if (decisions.groq === 'SELL') modelDecisions.push('Groq');
    if (decisions.mistral === 'SELL') modelDecisions.push('Mistral');
    return modelDecisions;
}

/**
 * Check if there is consensus among models (2 out of 3 agree)
 * @param {Object} decisions - Object containing model decisions
 * @returns {string|null} - The consensus action or null if no consensus
 */
function checkLLMConsensus(decisions) {
    const validDecisions = Object.values(decisions).filter(d => d);
    if (validDecisions.length < 2) return null; // Need at least 2 valid decisions
    
    // Count occurrences of each action
    const counts = {
        'BUY': 0,
        'SELL': 0,
        'HOLD': 0
    };
    
    validDecisions.forEach(d => counts[d]++);
    
    // 2 out of 3 models agree (or all 3)
    const maxAction = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    return counts[maxAction] >= 2 ? maxAction : null;
}

/**
 * Calculate accuracy percentage for a model based on its trade history
 * @param {string} model - Model name
 * @returns {number} - Accuracy percentage
 */
function calculateAccuracy(model) {
    const trades = window.tradeHistory[model];
    if (trades.length === 0) return 0;

    const correctTrades = trades.filter(trade => trade.profitable).length;
    return ((correctTrades / trades.length) * 100).toFixed(1);
}

/**
 * Calculate the volatility for market conditions
 * @param {number} currentPrice - Current price
 * @param {Object} volatilityTracker - Object to track volatility
 */
function calculateVolatility(currentPrice, volatilityTracker) {
    if (!volatilityTracker.data) {
        volatilityTracker.data = [];
    }

    // Add current price to the data array
    volatilityTracker.data.push(currentPrice);

    // Keep only the last 'window' number of data points
    if (volatilityTracker.data.length > volatilityTracker.window) {
        volatilityTracker.data.shift();
    }

    // Need at least 2 data points to calculate volatility
    if (volatilityTracker.data.length < 2) {
        volatilityTracker.current = 0;
        return;
    }

    // Calculate standard deviation of price returns
    const returns = [];
    for (let i = 1; i < volatilityTracker.data.length; i++) {
        const prevPrice = volatilityTracker.data[i - 1];
        const currentPrice = volatilityTracker.data[i];
        // Calculate percentage return
        returns.push((currentPrice - prevPrice) / prevPrice);
    }

    // Calculate mean
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;

    // Calculate variance
    const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / returns.length;

    // Volatility is the standard deviation
    volatilityTracker.current = Math.sqrt(variance) * 100; // Convert to percentage
}

/**
 * Calculate dynamic threshold based on market volatility
 * @param {number} volatility - Current market volatility
 * @returns {number} - Dynamic threshold value
 */
function calculateDynamicThreshold(volatility) {
    // Base threshold is 0.5%
    const baseThreshold = 0.5;
    
    // Higher volatility = higher threshold (more movement needed to be significant)
    // Lower volatility = lower threshold (less movement can be significant)
    
    // If volatility is very low (< 1%)
    if (volatility < 1) {
        return baseThreshold * 0.8; // Lower threshold to 0.4%
    }
    // If volatility is moderate (1-3%)
    else if (volatility < 3) {
        return baseThreshold; // Standard threshold 0.5%
    }
    // If volatility is high (3-5%)
    else if (volatility < 5) {
        return baseThreshold * 1.5; // Higher threshold 0.75%
    }
    // If volatility is very high (>5%)
    else {
        return baseThreshold * 2; // Much higher threshold 1%
    }
}

/**
 * Calculate trade score based on decision and price change
 * @param {string} decision - Model decision (BUY, SELL, HOLD)
 * @param {number} priceChangePercent - Price change percentage
 * @param {number} threshold - Dynamic threshold for significance
 * @returns {number} - Score between 0 and 1.5
 */
function calculateTradeScore(decision, priceChangePercent, threshold) {
    // Base score for correct direction
    let score = 0;
    
    // BUY decision
    if (decision === 'BUY') {
        if (priceChangePercent > threshold) {
            // Correct BUY decision
            score = 1.0;
            // Bonus points for magnitude of price change - up to 0.5 extra
            score += Math.min(0.5, (priceChangePercent - threshold) / 10);
        } else if (priceChangePercent > -threshold) {
            // Not significant change, but not wrong
            score = 0.5;
        } else {
            // Wrong direction
            score = 0;
        }
    }
    // SELL decision
    else if (decision === 'SELL') {
        if (priceChangePercent < -threshold) {
            // Correct SELL decision
            score = 1.0;
            // Bonus points for magnitude of price drop - up to 0.5 extra
            score += Math.min(0.5, (Math.abs(priceChangePercent) - threshold) / 10);
        } else if (priceChangePercent < threshold) {
            // Not significant change, but not wrong
            score = 0.5;
        } else {
            // Wrong direction
            score = 0;
        }
    }
    // HOLD decision
    else if (decision === 'HOLD') {
        if (Math.abs(priceChangePercent) <= threshold) {
            // Correct HOLD decision - price didn't change significantly
            score = 1.0;
        } else {
            // Missed opportunity
            score = 0.3;
        }
    }
    
    return score;
}

/**
 * Update accuracy for each model based on current price
 * @param {number} currentPrice - Current ETH price
 */
function updateAccuracy(currentPrice) {
    if (window.lastDecisions.price !== null) {
        const priceChange = currentPrice - window.lastDecisions.price;
        const priceChangePercent = (priceChange / window.lastDecisions.price) * 100;

        // Update market volatility
        calculateVolatility(currentPrice, window.marketVolatility);

        // Get dynamic threshold based on market conditions
        const threshold = calculateDynamicThreshold(window.marketVolatility.current);

        // Update accuracy for each model
        ['gemini', 'groq', 'mistral'].forEach(model => {
            if (window.lastDecisions[model]) {
                const decision = window.lastDecisions[model];
                const score = calculateTradeScore(decision, priceChangePercent, threshold);
                
                // Determine if the decision was correct (for raw accuracy)
                let isCorrect = false;
                if ((decision === 'BUY' && priceChangePercent > threshold) ||
                    (decision === 'SELL' && priceChangePercent < -threshold) ||
                    (decision === 'HOLD' && Math.abs(priceChangePercent) <= threshold)) {
                    isCorrect = true;
                }
                
                // Update raw accuracy tracking
                window.aiRawAccuracy[model].total++;
                if (isCorrect) {
                    window.aiRawAccuracy[model].correct++;
                }
                window.aiRawAccuracy[model].accuracy = (window.aiRawAccuracy[model].correct / window.aiRawAccuracy[model].total) * 100;

                // Record trade with enhanced metrics
                window.tradeHistory[model].push({
                    timestamp: new Date(),
                    decision: decision,
                    priceChange: priceChangePercent,
                    score: score,
                    threshold: threshold,
                    volatility: window.marketVolatility.current,
                    price: currentPrice,
                    isCorrect: isCorrect
                });

                // Keep only last 100 trades for more recent performance focus
                if (window.tradeHistory[model].length > 100) {
                    window.tradeHistory[model].shift();
                }
            }
        });
    }

    // Update accuracy display with weighted metrics
    ['gemini', 'groq', 'mistral'].forEach(model => {
        const accuracyElement = document.getElementById(`${model}-accuracy`);
        const rawAccuracyElement = document.getElementById(`${model}-raw-accuracy`);
        
        if (accuracyElement) {
            const trades = window.tradeHistory[model];
            if (trades.length > 0) {
                // Calculate weighted average score
                const recentTrades = trades.slice(-20); // Last 20 trades
                const weights = recentTrades.map((_, i) => 1 + (i / recentTrades.length));
                const totalWeight = weights.reduce((sum, w) => sum + w, 0);

                const weightedScore = recentTrades.reduce((sum, trade, i) => 
                    sum + (trade.score * weights[i]), 0) / totalWeight;

                const accuracy = (weightedScore * 100).toFixed(1);
                accuracyElement.textContent = `${accuracy}%`;
                accuracyElement.className = `font-bold ${
                    parseFloat(accuracy) >= 65 ? 'text-green-400' :
                    parseFloat(accuracy) >= 45 ? 'text-yellow-400' :
                    'text-red-400'
                }`;
            } else {
                // No trades yet, show 0%
                accuracyElement.textContent = '0.0%';
                accuracyElement.className = 'font-bold text-gray-400';
            }
        }
        
        // Update raw accuracy display if available - ONLY if wallet is connected
        if (rawAccuracyElement && window.userAccount && window.aiRawAccuracy[model].total > 0) {
            const rawAccuracy = window.aiRawAccuracy[model].accuracy.toFixed(1);
            rawAccuracyElement.textContent = `${rawAccuracy}%`;
            rawAccuracyElement.className = `font-bold ${
                parseFloat(rawAccuracy) >= 65 ? 'text-green-400' :
                parseFloat(rawAccuracy) >= 45 ? 'text-yellow-400' :
                'text-red-400'
            }`;
        } else if (rawAccuracyElement && !window.userAccount) {
            // If wallet is not connected, don't show any accuracy data
            rawAccuracyElement.textContent = '0.0%';
            rawAccuracyElement.className = 'font-bold text-xs text-gray-400';
        }
    });
}

// Make functions available globally
window.getModelDecisions = getModelDecisions;
window.getModelSellDecisions = getModelSellDecisions;
window.checkLLMConsensus = checkLLMConsensus;
window.calculateAccuracy = calculateAccuracy;
window.calculateVolatility = calculateVolatility;
window.calculateDynamicThreshold = calculateDynamicThreshold;
window.calculateTradeScore = calculateTradeScore;
window.updateAccuracy = updateAccuracy; 