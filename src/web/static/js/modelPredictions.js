// Model prediction analysis functions for Simple Crypto Trading Bot Chef

// Constants for swap amount minimums
const MIN_USD_SWAP_AMOUNT = 1.0; // Minimum USD amount for BUY signals
const MIN_ETH_SWAP_AMOUNT = 0.0001; // Minimum ETH amount for SELL signals

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
 * Update model decisions in the UI based on data and wallet connection status
 * @param {Object} data - Trading data including model actions
 * @param {string|null} walletAddress - Connected wallet address or null if no wallet is connected
 */
function updateModelDecisions(data, walletAddress) {
    const models = ['gemini', 'groq', 'mistral'];
    const modelActions = {
        gemini: data.gemini_action,
        groq: data.groq_action,
        mistral: data.mistral_action
    };

    // First, validate ETH price data
    const hasValidPrice = data.eth_price && !isNaN(parseFloat(data.eth_price)) && parseFloat(data.eth_price) > 0;
    
    // For each model decision card
    models.forEach(model => {
        const decisionElement = document.getElementById(`${model}-decision`);
        if (!decisionElement) return;

        // First remove all classes to start fresh
        decisionElement.classList.remove('text-green-400', 'text-red-400', 'text-blue-400', 'text-gray-400', 'text-yellow-400');
        
        if (!walletAddress) {
            // No wallet connected - show connect wallet message
            decisionElement.innerHTML = `<span class="text-sm">Connect your wallet first</span>`;
            decisionElement.classList.add('text-gray-400');
            return;
        }
        
        // If ETH price is invalid, show error message
        if (!hasValidPrice) {
            decisionElement.innerHTML = `<span class="text-sm">Waiting for price data</span>`;
            decisionElement.classList.add('text-gray-400');
            return;
        }

        // Wallet connected - show action and appropriate color
        const action = modelActions[model];
        
        // If no action yet (null, undefined, empty string), show "Decision in progress"
        if (!action || action === '') {
            decisionElement.innerHTML = `<span>Decision in progress</span>`;
            decisionElement.classList.add('text-gray-400');
            return;
        }
        
        // Valid action received, show the action with appropriate styling
        let actionClass = '';
        
        switch (action) {
            case 'BUY':
                actionClass = 'text-white';
                break;
            case 'SELL':
                actionClass = 'text-gray-300';
                break;
            case 'HOLD':
                actionClass = 'text-white';
                break;
            default:
                actionClass = 'text-gray-400';
        }
        
        decisionElement.textContent = action;
        decisionElement.classList.add(actionClass);
        
        // Only store decisions when wallet is connected
        if (walletAddress) {
            // Store this decision linked to the current wallet
            storeAIDecisionForWallet(model, action, data.eth_price, walletAddress);
        }
    });

    // Check for consensus and notify if wallet is connected
    if (walletAddress && hasValidPrice) {
        const decisions = {
            gemini: data.gemini_action,
            groq: data.groq_action,
            mistral: data.mistral_action
        };

        // Filter out undefined or empty decisions
        const validDecisions = {};
        for (const [model, decision] of Object.entries(decisions)) {
            if (decision && decision !== '') {
                validDecisions[model] = decision;
            }
        }

        // Only check consensus if we have at least 2 valid decisions
        if (Object.keys(validDecisions).length >= 2) {
            const consensus = checkLLMConsensus(validDecisions);
            if (consensus && (consensus === 'BUY' || consensus === 'SELL')) {
                const buyModels = getModelDecisions(decisions);
                const sellModels = getModelSellDecisions(decisions);
                const currentPrice = data.eth_price.toFixed(2);

                let message = '';
                if (consensus === 'BUY') {
                    // Get the swap amount from wallet manager's recommendation
                    const swapAmount = window.walletBalances?.recommendedSwapAmount || 0;
                    let hasCalculatedSwap = false;
                    
                    if (swapAmount > 0) {
                        const ethAmount = swapAmount / currentPrice;
                        message = `🟢 BUY Signal at $${currentPrice}\n`;
                        message += `Recommended by: ${buyModels.join(', ')}\n`;
                        message += `Suggested Swap: ~$${swapAmount.toFixed(2)} USDC → ${ethAmount.toFixed(6)} ETH`;
                        hasCalculatedSwap = true;
                    } else {
                        // Use the same fallback mechanism as wallet notifications
                        const totalValue = window.walletBalances?.totalValueUSD || 0;
                        const currentEthAllocation = window.walletBalances?.ethAllocation || 0;
                        const targetEthMin = window.walletBalances?.targetEthMin || 40;
                        
                        if (totalValue > 0 && currentEthAllocation < targetEthMin) {
                            // Calculate amount needed to reach target minimum
                            const targetEthValue = (totalValue * targetEthMin / 100);
                            const currentEthValue = (totalValue * currentEthAllocation / 100);
                            const fallbackAmount = targetEthValue - currentEthValue;
                            
                            if (fallbackAmount > 0) {
                                const ethAmount = fallbackAmount / currentPrice;
                                message = `🟢 BUY Signal at $${currentPrice}\n`;
                                message += `Recommended by: ${buyModels.join(', ')}\n`;
                                message += `Suggested Swap: ~$${fallbackAmount.toFixed(2)} USDC → ${ethAmount.toFixed(6)} ETH`;
                                hasCalculatedSwap = true;
                            }
                        }
                        
                        // If we couldn't calculate a meaningful amount, use a minimal amount
                        if (!hasCalculatedSwap) {
                            const minimalAmount = MIN_USD_SWAP_AMOUNT;
                            const ethAmount = minimalAmount / currentPrice;
                            message = `🟢 BUY Signal at $${currentPrice}\n`;
                            message += `Recommended by: ${buyModels.join(', ')}\n`;
                            message += `Suggested Swap: ~$${minimalAmount.toFixed(2)} USDC → ${ethAmount.toFixed(6)} ETH`;
                        }
                    }
                } else if (consensus === 'SELL') {
                    // Get the swap amount from wallet manager's recommendation
                    const swapAmount = window.walletBalances?.recommendedSwapAmount || 0;
                    let hasCalculatedSwap = false;
                    
                    if (swapAmount > 0) {
                        // Calculate ETH amount first as a number
                        const ethAmount = swapAmount / currentPrice;
                        // Calculate USD amount as a number
                        const usdAmount = ethAmount * currentPrice;
                        message = `🔴 SELL Signal at $${currentPrice}\n`;
                        message += `Recommended by: ${sellModels.join(', ')}\n`;
                        message += `Suggested Swap: ~${ethAmount.toFixed(6)} ETH → $${usdAmount.toFixed(2)} USDC`;
                        hasCalculatedSwap = true;
                    } else {
                        // Use the same fallback mechanism as wallet notifications
                        const totalValue = window.walletBalances?.totalValueUSD || 0;
                        const currentEthAllocation = window.walletBalances?.ethAllocation || 0;
                        const targetEthMax = window.walletBalances?.targetEthMax || 60;
                        
                        if (totalValue > 0 && currentEthAllocation > targetEthMax) {
                            // Calculate amount needed to reach target maximum
                            const targetEthValue = (totalValue * targetEthMax / 100);
                            const currentEthValue = (totalValue * currentEthAllocation / 100);
                            const excessEthValue = currentEthValue - targetEthValue;
                            
                            if (excessEthValue > 0) {
                                const ethAmount = excessEthValue / currentPrice;
                                const usdAmount = ethAmount * currentPrice;
                                message = `🔴 SELL Signal at $${currentPrice}\n`;
                                message += `Recommended by: ${sellModels.join(', ')}\n`;
                                message += `Suggested Swap: ~${ethAmount.toFixed(6)} ETH → $${usdAmount.toFixed(2)} USDC`;
                                hasCalculatedSwap = true;
                            }
                        }
                        
                        // If we couldn't calculate a meaningful amount, use a minimal amount
                        if (!hasCalculatedSwap) {
                            const minimalEthAmount = MIN_ETH_SWAP_AMOUNT;
                            const usdAmount = minimalEthAmount * currentPrice;
                            message = `🔴 SELL Signal at $${currentPrice}\n`;
                            message += `Recommended by: ${sellModels.join(', ')}\n`;
                            message += `Suggested Swap: ~${minimalEthAmount.toFixed(6)} ETH → $${usdAmount.toFixed(2)} USDC`;
                        }
                    }
                }

                // Show browser notification for BUY and SELL signals only
                showNotification(message, 'info');

                // Log the notification being sent for debugging
                console.log(`LLM CONSENSUS: ${consensus} signal detected from ${Object.keys(validDecisions).length} models`);
                console.log(`Sending notification with message: "${message}"`);
                console.log(`WALLET ADDRESS: ${walletAddress}, ENABLE_RECOMMENDATIONS: ${window.enableSwapRecommendations}`);

                // Force wallet balance refresh with a slight delay
                // This ensures the wallet card recommendation is updated first
                setTimeout(() => {
                    getWalletBalances().then(() => {
                        // Send wallet notification after balances are refreshed - only for BUY and SELL
                        console.log(`Calling sendWalletNotification(${consensus}, "${message}")`);
                        sendWalletNotification(consensus, message);
                    });
                }, 500);
            } else if (consensus === 'HOLD') {
                // For HOLD signals, don't show any notification, just refresh wallet balances
                console.log('HOLD signal - No notification needed');
                
                // Still refresh wallet balances to keep things in sync
                getWalletBalances();
            } else {
                // No consensus, but still refresh wallet balances
                getWalletBalances();
            }
        } else {
            console.log("Not enough valid decisions to determine consensus");
        }
    }

    // Update the global lastDecisions object with current price and model decisions
    if (hasValidPrice) {
        window.lastDecisions = {
            gemini: modelActions.gemini,
            groq: modelActions.groq,
            mistral: modelActions.mistral,
            price: parseFloat(data.eth_price)
        };
    }
}

/**
 * Store AI decision for specific wallet
 * @param {string} model - Model name
 * @param {string} decision - Model decision
 * @param {number} price - Current ETH price
 * @param {string} walletAddress - Connected wallet address
 * @returns {Promise<void>}
 */
async function storeAIDecisionForWallet(model, decision, price, walletAddress) {
    try {
        await fetch('/api/store-ai-decision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                decision: decision,
                eth_price: price,
                wallet_address: walletAddress
            })
        });
        console.log(`Stored ${decision} decision for ${model} model linked to wallet ${walletAddress}`);
    } catch (error) {
        console.error('Error storing AI decision for wallet:', error);
    }
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

    // Update accuracy values in the UI
    ['gemini', 'groq', 'mistral'].forEach(model => {
        const accuracy = calculateAccuracy(model);
        const rawAccuracy = (window.aiRawAccuracy[model].accuracy).toFixed(1);
        
        const accuracyElement = document.getElementById(`${model}-accuracy`);
        const rawAccuracyElement = document.getElementById(`${model}-raw-accuracy`);
        
        if (accuracyElement) {
            accuracyElement.textContent = `${accuracy}%`;
            accuracyElement.className = `font-bold text-white`;
        }
        
        if (rawAccuracyElement) {
            rawAccuracyElement.textContent = `${rawAccuracy}%`;
            rawAccuracyElement.className = `font-bold text-xs text-white`;
        }
    });
}

// Make functions available globally
window.getModelDecisions = getModelDecisions;
window.getModelSellDecisions = getModelSellDecisions;
window.updateModelDecisions = updateModelDecisions;
window.storeAIDecisionForWallet = storeAIDecisionForWallet;
window.checkLLMConsensus = checkLLMConsensus;
window.calculateAccuracy = calculateAccuracy;
window.calculateVolatility = calculateVolatility;
window.calculateDynamicThreshold = calculateDynamicThreshold;
window.calculateTradeScore = calculateTradeScore;
window.updateAccuracy = updateAccuracy; 