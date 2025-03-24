// Market analysis functions for Simple Crypto Trading Bot Chef

/**
 * Calculate market volatility based on price data
 * @param {number} price - Current price to add to volatility calculation
 * @param {Object} volatilityTracker - Object containing volatility data
 * @returns {number} - Current volatility value
 */
function calculateVolatility(price, volatilityTracker) {
    volatilityTracker.data.push(price);
    if (volatilityTracker.data.length > volatilityTracker.window * 60) { // 60 data points per hour
        volatilityTracker.data.shift();
    }

    if (volatilityTracker.data.length > 1) {
        const returns = volatilityTracker.data.slice(1).map((p, i) => 
            (p - volatilityTracker.data[i]) / volatilityTracker.data[i]
        );
        volatilityTracker.current = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * 100;
    }
    
    return volatilityTracker.current;
}

/**
 * Calculate dynamic trading threshold based on market volatility
 * @param {number} volatility - Current market volatility
 * @returns {number} - Adjusted threshold for trading decisions
 */
function calculateDynamicThreshold(volatility) {
    // Base threshold of 1%, adjusted by volatility
    const baseThreshold = 1.0;
    const volatilityFactor = Math.max(0.5, Math.min(2.0, volatility));
    return baseThreshold * volatilityFactor;
}

/**
 * Calculate trade score based on decision and price movement
 * @param {string} decision - Trading decision (BUY, SELL, HOLD)
 * @param {number} priceChangePercent - Percentage price change
 * @param {number} threshold - Dynamic threshold for decision
 * @returns {number} - Score for the trade (0-1.5)
 */
function calculateTradeScore(decision, priceChangePercent, threshold) {
    let score = 0;
    const magnitude = Math.abs(priceChangePercent);

    // Enhanced scoring system with trend consideration
    if (decision === 'BUY') {
        if (priceChangePercent > threshold) {
            // Correct BUY decision
            score = 1.0;
            // Enhanced bonus points for strong upward moves
            const bonusMultiplier = Math.min(1.5, magnitude / (threshold * 3));
            score += 0.5 * bonusMultiplier;
        } else if (priceChangePercent > 0) {
            // Right direction but didn't meet threshold
            score = 0.5;
        }
    } else if (decision === 'SELL') {
        if (priceChangePercent < -threshold) {
            // Correct SELL decision
            score = 1.0;
            // Enhanced bonus points for strong downward moves
            const bonusMultiplier = Math.min(1.5, magnitude / (threshold * 3));
            score += 0.5 * bonusMultiplier;
        } else if (priceChangePercent < 0) {
            // Right direction but didn't meet threshold
            score = 0.5;
        }
    } else if (decision === 'HOLD') {
        if (magnitude <= threshold) {
            // Perfect HOLD decision
            score = 1.0;
            // Small bonus for very stable price
            score += 0.5 * (1 - magnitude / threshold);
        } else if (magnitude <= threshold * 1.5) {
            // Acceptable HOLD in moderate volatility
            score = 0.5;
        } else {
            // HOLD during strong trend - reduce score
            score = 0.25;
        }
    }

    return score;
}

/**
 * Check if 2 out of 3 LLMs agree on a decision
 * @param {Object} decisions - Object containing model decisions
 * @returns {string|null} - Consensus decision or null if no consensus
 */
function checkLLMConsensus(decisions) {
    const buyVotes = Object.values(decisions).filter(d => d === 'BUY').length;
    const sellVotes = Object.values(decisions).filter(d => d === 'SELL').length;
    const holdVotes = Object.values(decisions).filter(d => d === 'HOLD').length;

    if (buyVotes >= 2) {
        return 'BUY';
    } else if (sellVotes >= 2) {
        return 'SELL';
    } else if (holdVotes >= 2) {
        return 'HOLD';
    }
    return null;
}

// Make functions available globally
window.calculateVolatility = calculateVolatility;
window.calculateDynamicThreshold = calculateDynamicThreshold;
window.calculateTradeScore = calculateTradeScore;
window.checkLLMConsensus = checkLLMConsensus; 