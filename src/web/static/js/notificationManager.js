// Notification management functions for Simple Crypto Trading Bot Chef

// Initialize global variables
window.llmSellAdditionalData = null;
window.llmBuyAdditionalData = null;

/**
 * Request permission to send browser notifications
 * @returns {Promise<string>} - Promise resolving to the permission state
 */
async function requestNotificationPermission() {
    if (!window.userAccount) {
        console.log('No wallet connected - skipping notification permission request');
        return Promise.resolve('not_applicable'); // Return a resolved promise to prevent catch errors
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        throw error;
    }
}

/**
 * Send a wallet notification for trading signals
 * @param {string} signalType - The type of signal (BUY, SELL, HOLD)
 * @param {string} message - The notification message
 */
async function sendWalletNotification(signalType, message) {
    if (!window.userAccount || !window.ethereum || !window.web3) {
        console.log("Cannot send wallet notification: no wallet connected");
        return;
    }
    
    try {
        // Only process BUY or SELL signals (skip HOLD)
        if (signalType !== 'BUY' && signalType !== 'SELL') {
            console.log(`Skipping wallet notification for ${signalType} signal - only BUY and SELL signals get wallet notifications`);
            return;
        }
        
        // Log that we're sending a wallet notification
        console.log(`Sending wallet notification for ${signalType} signal to ${window.userAccount}`);
        
        // Get current wallet balances and validate
        const ethBalance = window.walletBalances?.eth || 0;
        const usdcBalance = window.walletBalances?.usdc || 0;
        const currentPrice = window.walletBalances?.ethusd || 0;
        
        // Strictly validate price data is available - NEVER use default values
        if (currentPrice <= 0 || isNaN(currentPrice)) {
            console.log("No valid ETH price available - cannot send transaction suggestion");
            showNotification(`${signalType} signal received but ETH price data unavailable. No transaction suggested.`, 'warning');
            return;
        }
        
        // Get current chain ID
        const chainId = await window.web3.eth.getChainId();
        const isLinea = chainId === 59144;
        const isEthereum = chainId === 1;
        
        // Record this wallet action in the database
        try {
            await recordWalletAction(signalType);
        } catch (recordError) {
            console.error("Failed to record wallet action, continuing with notification:", recordError);
            // Non-blocking - continue with notification processing
        }
        
        // Show the notification with the exact message passed from walletManager
        showNotification(message, 'info');
        
        // Parse the swap amount from the message parameter
        let swapAmount = 0;
        let ethAmount = 0;
        
        if (signalType === 'BUY') {
            // First check for the LLM signal format: "BUY Signal at $2085.28"
            const llmSignalMatch = message.match(/BUY Signal at \$([0-9.]+)/);
            
            if (llmSignalMatch && llmSignalMatch[1]) {
                // LLM signal format - extract the price directly
                const price = parseFloat(llmSignalMatch[1]);
                if (!isNaN(price) && price > 0) {
                    // Extract which models recommended this trade
                    const recommendedBy = message.match(/Recommended by: (.*)/);
                    const modelsText = recommendedBy ? recommendedBy[1] : "AI models";
                    
                    // Get the recommended swap amount from wallet manager
                    let swapAmount = window.walletBalances?.recommendedSwapAmount || 0;
                    
                    if (swapAmount > 0) {
                        // Use the recommended amount from wallet manager
                        if (currentPrice > 0) {
                            ethAmount = swapAmount / currentPrice;
                            swapAmount = ethAmount * currentPrice;
                            console.log(`LLM BUY Signal: Using recommended ${ethAmount.toFixed(6)} ETH = $${swapAmount.toFixed(2)} USDC at price $${currentPrice}`);
                            
                            // Set additional data for the transaction
                            message = `BUY Signal at $${currentPrice}\nRecommended by: ${modelsText}`;
                            
                            // Prepare the additional data for the transaction
                            const llmBuyAdditionalData = ` [LLM TRADING SIGNAL - ${modelsText} recommend buying ETH at $${currentPrice}. This would swap ${ethAmount.toFixed(6)} ETH for ~$${swapAmount.toFixed(2)} USDC]`;
                            
                            // Store this for use in the transaction params later
                            window.llmBuyAdditionalData = llmBuyAdditionalData;
                        } else {
                            console.log(`LLM BUY Signal: Cannot calculate USDC amount: currentPrice is invalid`);
                            swapAmount = 0;
                        }
                    } else {
                        // Calculate amount based on portfolio value and target allocation
                        const totalValue = window.walletBalances?.totalValueUSD || 0;
                        const currentEthAllocation = window.walletBalances?.ethAllocation || 0;
                        const targetEthMin = window.walletBalances?.targetEthMin || 40;
                        
                        if (totalValue > 0 && currentEthAllocation < targetEthMin) {
                            // Calculate amount needed to reach target minimum
                            const targetEthValue = (totalValue * targetEthMin / 100);
                            const currentEthValue = (totalValue * currentEthAllocation / 100);
                            const fallbackAmount = targetEthValue - currentEthValue;
                            
                            if (fallbackAmount > 0 && currentPrice > 0) {
                                ethAmount = fallbackAmount / currentPrice;
                                swapAmount = ethAmount * currentPrice;
                                console.log(`LLM BUY Signal: Using portfolio-based $${fallbackAmount.toFixed(2)} USDC = ${ethAmount.toFixed(6)} ETH at price $${currentPrice}`);
                                
                                // Set additional data for the transaction
                                message = `BUY Signal at $${currentPrice}\nRecommended by: ${modelsText}`;
                                
                                // Prepare the additional data for the transaction
                                const llmBuyAdditionalData = ` [LLM TRADING SIGNAL - ${modelsText} recommend buying ETH at $${currentPrice}. This would swap $${fallbackAmount.toFixed(2)} USDC for ~${ethAmount.toFixed(6)} ETH]`;
                                
                                // Store this for use in the transaction params later
                                window.llmBuyAdditionalData = llmBuyAdditionalData;
                            }
                        }
                        
                        // If we couldn't calculate a meaningful amount, use a minimal amount
                        if (!ethAmount || ethAmount <= 0) {
                            const minimalAmount = 1.0; // $1 minimum
                            ethAmount = minimalAmount / currentPrice;
                            swapAmount = minimalAmount * currentPrice;
                            console.log(`LLM BUY Signal: Using minimal $${minimalAmount.toFixed(2)} USDC = ${ethAmount.toFixed(6)} ETH at price $${currentPrice}`);
                            
                            // Set additional data for the transaction
                            message = `BUY Signal at $${currentPrice}\nRecommended by: ${modelsText}`;
                            
                            // Prepare the additional data for the transaction
                            const llmBuyAdditionalData = ` [LLM TRADING SIGNAL - ${modelsText} recommend buying ETH at $${currentPrice}. This would swap $${minimalAmount.toFixed(2)} USDC for ~${ethAmount.toFixed(6)} ETH]`;
                            
                            // Store this for use in the transaction params later
                            window.llmBuyAdditionalData = llmBuyAdditionalData;
                        }
                    }
                }
            } else {
                // Original "Suggested Swap" format: "Suggested Swap: ~$1.42 USDC → ETH"
                const usdMatch = message.match(/~\$([0-9.]+)/);
                if (usdMatch && usdMatch[1]) {
                    swapAmount = parseFloat(usdMatch[1]);
                    // Make sure currentPrice is valid before dividing
                    if (currentPrice > 0) {
                        // Calculate the ETH equivalent for the transaction using the currentPrice from wallet balances
                        // This calculates how much ETH the user would receive when swapping USDC
                        ethAmount = swapAmount / currentPrice;
                        
                        // Make sure we have a reasonable value that's not subject to floating point errors
                        ethAmount = parseFloat(ethAmount.toFixed(8));
                        console.log(`BUY calculation: $${swapAmount.toFixed(2)} / $${currentPrice} = ${ethAmount} ETH (after rounding)`);
                        
                        // Validate the ETH amount format is valid for toWei
                        let ethAmountString = ethAmount.toString();
                        if (!/^\d*\.?\d*$/.test(ethAmountString) || isNaN(ethAmount) || !isFinite(ethAmount)) {
                            console.log(`Invalid ETH amount calculated: ${ethAmountString}. Using fallback.`);
                            ethAmount = 0;
                        } else {
                            console.log(`Parsed BUY: $${swapAmount.toFixed(2)} USDC = ${ethAmount.toFixed(6)} ETH at price $${currentPrice}`);
                        }
                    } else {
                        console.log(`Cannot calculate ETH amount: currentPrice (${currentPrice}) is invalid`);
                        ethAmount = 0;
                    }
                }
            }
        } else if (signalType === 'SELL') {
            // First check for the LLM signal format: "SELL Signal at $2085.28"
            const llmSignalMatch = message.match(/SELL Signal at \$([0-9.]+)/);
            
            if (llmSignalMatch && llmSignalMatch[1]) {
                // LLM signal format - extract the price directly
                const price = parseFloat(llmSignalMatch[1]);
                if (!isNaN(price) && price > 0) {
                    // Extract which models recommended this trade
                    const recommendedBy = message.match(/Recommended by: (.*)/);
                    const modelsText = recommendedBy ? recommendedBy[1] : "AI models";
                    
                    // Get the recommended swap amount from wallet manager
                    let swapAmount = window.walletBalances?.recommendedSwapAmount || 0;
                    
                    if (swapAmount > 0) {
                        // Use the recommended amount from wallet manager
                        if (currentPrice > 0) {
                            ethAmount = swapAmount / currentPrice;
                            swapAmount = ethAmount * currentPrice;
                            console.log(`LLM SELL Signal: Using recommended ${ethAmount.toFixed(6)} ETH = $${swapAmount.toFixed(2)} USDC at price $${currentPrice}`);
                            
                            // Set additional data for the transaction
                            message = `SELL Signal at $${currentPrice}\nRecommended by: ${modelsText}`;
                            
                            // Prepare the additional data for the transaction
                            const llmAdditionalData = ` [LLM TRADING SIGNAL - ${modelsText} recommend selling ETH at $${currentPrice}. This would swap ${ethAmount.toFixed(6)} ETH for ~$${swapAmount.toFixed(2)} USDC]`;
                            
                            // Store this for use in the transaction params later
                            window.llmSellAdditionalData = llmAdditionalData;
                        } else {
                            console.log(`LLM SELL Signal: Cannot calculate USDC amount: currentPrice is invalid`);
                            swapAmount = 0;
                        }
                    } else {
                        // Calculate amount based on portfolio value and target allocation
                        const totalValue = window.walletBalances?.totalValueUSD || 0;
                        const currentEthAllocation = window.walletBalances?.ethAllocation || 0;
                        const targetEthMax = window.walletBalances?.targetEthMax || 60;
                        
                        if (totalValue > 0 && currentEthAllocation > targetEthMax) {
                            // Calculate amount needed to reach target maximum
                            const targetEthValue = (totalValue * targetEthMax / 100);
                            const currentEthValue = (totalValue * currentEthAllocation / 100);
                            const excessEthValue = currentEthValue - targetEthValue;
                            
                            if (excessEthValue > 0 && currentPrice > 0) {
                                ethAmount = excessEthValue / currentPrice;
                                swapAmount = ethAmount * currentPrice;
                                console.log(`LLM SELL Signal: Using portfolio-based ${ethAmount.toFixed(6)} ETH = $${swapAmount.toFixed(2)} USDC at price $${currentPrice}`);
                                
                                // Set additional data for the transaction
                                message = `SELL Signal at $${currentPrice}\nRecommended by: ${modelsText}`;
                                
                                // Prepare the additional data for the transaction
                                const llmAdditionalData = ` [LLM TRADING SIGNAL - ${modelsText} recommend selling ETH at $${currentPrice}. This would swap ${ethAmount.toFixed(6)} ETH for ~$${swapAmount.toFixed(2)} USDC]`;
                                
                                // Store this for use in the transaction params later
                                window.llmSellAdditionalData = llmAdditionalData;
                            }
                        }
                        
                        // If we couldn't calculate a meaningful amount, use a minimal amount
                        if (!ethAmount || ethAmount <= 0) {
                            const minimalAmount = 0.0001; // 0.0001 ETH minimum
                            ethAmount = minimalAmount;
                            swapAmount = minimalAmount * currentPrice;
                            console.log(`LLM SELL Signal: Using minimal ${ethAmount.toFixed(6)} ETH = $${swapAmount.toFixed(2)} USDC at price $${currentPrice}`);
                            
                            // Set additional data for the transaction
                            message = `SELL Signal at $${currentPrice}\nRecommended by: ${modelsText}`;
                            
                            // Prepare the additional data for the transaction
                            const llmAdditionalData = ` [LLM TRADING SIGNAL - ${modelsText} recommend selling ETH at $${currentPrice}. This would swap ${ethAmount.toFixed(6)} ETH for ~$${swapAmount.toFixed(2)} USDC]`;
                            
                            // Store this for use in the transaction params later
                            window.llmSellAdditionalData = llmAdditionalData;
                        }
                    }
                }
            } else {
                // Original "Suggested Swap" format: "Suggested Swap: ~0.0123 ETH → $25.67 USDC"
                const ethMatch = message.match(/~([0-9.]+) ETH/);
                if (ethMatch && ethMatch[1]) {
                    // Validate the ETH amount format is valid before parsing
                    const rawEthAmount = ethMatch[1];
                    if (!/^\d*\.?\d*$/.test(rawEthAmount) || isNaN(parseFloat(rawEthAmount)) || !isFinite(parseFloat(rawEthAmount))) {
                        console.log(`Invalid ETH amount format in message: ${rawEthAmount}. Using fallback.`);
                        ethAmount = 0;
                    } else {
                        ethAmount = parseFloat(rawEthAmount);
                        
                        // Make sure currentPrice is valid before multiplying
                        if (currentPrice > 0) {
                            // Calculate USD equivalent using the currentPrice from wallet balances
                            swapAmount = ethAmount * currentPrice;
                            console.log(`Parsed SELL: ${ethAmount.toFixed(6)} ETH = $${swapAmount.toFixed(2)} USDC at price $${currentPrice}`);
                        } else {
                            console.log(`Cannot calculate USD amount: currentPrice (${currentPrice}) is invalid`);
                            swapAmount = 0;
                        }
                    }
                }
            }
        }
        
        // Validate the extracted amounts - extra safety check
        if (swapAmount <= 0 || ethAmount <= 0) {
            console.log(`Failed to parse valid swap amounts from message: "${message}"`);
            console.log(`DEBUG - signalType: ${signalType}, swapAmount: ${swapAmount}, ethAmount: ${ethAmount}, currentPrice: ${currentPrice}`);
            return;
        }
        
        console.log(`Parsed amounts from message: ${swapAmount.toFixed(2)} USD, ${ethAmount.toFixed(8)} ETH`);
        
        // Check if user has enabled actionable swap recommendations
        if (window.enableSwapRecommendations === true) {
            console.log("User has enabled actionable swap recommendations, preparing transaction");
            
            // Get gas price data for the transaction
            let gasPrice;
            let maxFeePerGas;
            let maxPriorityFeePerGas;
            let gasLimit = '0x5208'; // 21000 gas for standard transfer
            
            try {
                // Fetch current gas prices from backend
                const gasDataResponse = await fetch('/api/trading-data');
                const gasData = await gasDataResponse.json();
                
                if (gasData && gasData.gas_prices) {
                    // Use the standard gas price (convert from Gwei to Wei)
                    const standardGasPriceGwei = gasData.gas_prices.standard;
                    gasPrice = window.web3.utils.toWei(standardGasPriceGwei.toString(), 'gwei');
                    
                    // For EIP-1559 compatible networks
                    if (gasData.gas_prices.base_fee) {
                        const baseFeeGwei = gasData.gas_prices.base_fee;
                        // maxFeePerGas = 2 * baseFee + priorityFee
                        const priorityFeeGwei = 1.5; // 1.5 Gwei as priority fee
                        maxPriorityFeePerGas = window.web3.utils.toWei(priorityFeeGwei.toString(), 'gwei');
                        maxFeePerGas = window.web3.utils.toWei((2 * baseFeeGwei + priorityFeeGwei).toString(), 'gwei');
                    }
                }
            } catch (gasError) {
                console.warn("Error fetching gas data:", gasError);
                // Fallback gas values based on network
                if (isEthereum) {
                    gasPrice = window.web3.utils.toWei('50', 'gwei'); // 50 Gwei fallback for Ethereum
                    maxPriorityFeePerGas = window.web3.utils.toWei('1.5', 'gwei');
                    maxFeePerGas = window.web3.utils.toWei('100', 'gwei');
                } else if (isLinea) {
                    gasPrice = window.web3.utils.toWei('0.1', 'gwei'); // 0.1 Gwei fallback for Linea
                    maxPriorityFeePerGas = window.web3.utils.toWei('0.05', 'gwei');
                    maxFeePerGas = window.web3.utils.toWei('0.2', 'gwei');
                } else {
                    // Use a reasonable default for other networks
                    gasPrice = window.web3.utils.toWei('30', 'gwei');
                }
            }
            
            // Create and send a transaction to the wallet (this will just prompt the user, not execute automatically)
            try {
                // Prepare transaction parameters based on network support for EIP-1559
                let txParams = {
                    from: window.userAccount,
                    to: window.userAccount,
                    gas: gasLimit,
                    data: window.web3.utils.toHex(message), // Use the entire message for better clarity
                };
                
                // Set the appropriate value based on the signal type
                if (signalType === 'BUY') {
                    // For BUY signals, we need to use a proper ETH value that represents the swap
                    if (ethAmount > 0 && swapAmount > 0) {
                        try {
                            // For BUY notifications, we're simulating a token swap
                            // Since we can't actually send USDC in a native transaction,
                            // we'll create a "representative" transaction with the ETH equivalent
                            let ethAmountString = ethAmount.toString();
                            console.log(`BUY DEBUG - ethAmount: ${ethAmount}, ethAmountString: "${ethAmountString}"`);
                            
                            // Ensure the value is valid for toWei
                            if (!/^\d*\.?\d*$/.test(ethAmountString)) {
                                throw new Error("Invalid ETH amount format");
                            }
                            
                            // Check if amount is too large for safe conversion
                            if (ethAmount > 1000000) {
                                console.warn("ETH amount too large, limiting to 1,000,000 ETH for safety");
                                ethAmount = 1000000;
                                ethAmountString = ethAmount.toString();
                            }
                            
                            // For BUY signals, we should send the ETH amount that would be received
                            // This represents what the user would get when swapping USDC for ETH
                            const weiAmount = window.web3.utils.toWei(ethAmountString, 'ether');
                            console.log(`BUY DEBUG - Wei amount: ${weiAmount}`);
                            txParams.value = window.web3.utils.toHex(weiAmount);
                            
                            // Double-check the hex value
                            console.log(`BUY DEBUG - Final hex value: ${txParams.value}`);
                            
                            // Make sure this matches what we expect
                            const ethFromHex = window.web3.utils.fromWei(window.web3.utils.hexToNumberString(txParams.value), 'ether');
                            console.log(`BUY DEBUG - Converting hex back to ETH: ${ethFromHex}`);
                            
                            console.log(`Using equivalent ETH amount for BUY notification: ${ethAmountString} ETH (USDC value: $${swapAmount.toFixed(2)})`);
                            
                            // Update data to show it's a test transaction representing a BUY from LLM signals
                            const additionalData = window.llmBuyAdditionalData || 
                                ` [THIS IS A TEST - Would swap $${swapAmount.toFixed(2)} USDC to receive ~${ethAmount.toFixed(6)} ETH]`;
                            txParams.data = window.web3.utils.toHex(message + additionalData);
                            
                            // Clear the stored data after use
                            window.llmBuyAdditionalData = null;
                        } catch (valueError) {
                            console.error("Error setting ETH value for BUY:", valueError);
                            // Try to create a reasonable fallback based on the current price
                            if (currentPrice > 0) {
                                try {
                                    // Use 0.0005 ETH as a minimum value
                                    const minimalEth = 0.0005;
                                    txParams.value = window.web3.utils.toHex(window.web3.utils.toWei(minimalEth.toString(), 'ether'));
                                    console.log(`Using minimal ETH amount for BUY notification: ${minimalEth} ETH`);
                                } catch (fallbackError) {
                                    // If even that fails, use absolute minimum
                                    txParams.value = window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether'));
                                    console.log(`Falling back to absolute minimum for BUY notification due to error: ${fallbackError.message}`);
                                }
                            } else {
                                // Default fallback
                                txParams.value = window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether'));
                                console.log(`Falling back to test amount for BUY notification due to error: ${valueError.message}`);
                            }
                        }
                    } else {
                        // Fallback if parsing failed
                        txParams.value = window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether'));
                        console.log(`Falling back to test amount for BUY notification`);
                    }
                } else if (signalType === 'SELL') {
                    // For SELL signals, we use the actual ETH amount from the parsed message
                    // This gives a more realistic preview of what would be sent
                    if (ethAmount > 0) {
                        try {
                            let ethAmountString = ethAmount.toString();
                            // Ensure the value is valid for toWei
                            if (!/^\d*\.?\d*$/.test(ethAmountString)) {
                                throw new Error("Invalid ETH amount format");
                            }
                            
                            // Check if amount is too large for safe conversion
                            if (ethAmount > 1000000) {
                                console.warn("ETH amount too large, limiting to 1,000,000 ETH for safety");
                                ethAmount = 1000000;
                                ethAmountString = ethAmount.toString();
                            }
                            
                            txParams.value = window.web3.utils.toHex(window.web3.utils.toWei(ethAmountString, 'ether'));
                            console.log(`Using actual ETH amount for SELL notification: ${ethAmountString} ETH`);
                            
                            // Update data to show it's a test transaction
                            const additionalData = window.llmSellAdditionalData || 
                                ` [THIS IS A TEST - Would swap ${ethAmount.toFixed(6)} ETH to receive ~$${swapAmount.toFixed(2)} USDC]`;
                            txParams.data = window.web3.utils.toHex(message + additionalData);
                            
                            // Clear the stored data after use
                            window.llmSellAdditionalData = null;
                        } catch (valueError) {
                            console.error("Error setting ETH value:", valueError);
                            // Try to create a reasonable fallback based on the current price
                            if (currentPrice > 0 && swapAmount > 0) {
                                try {
                                    // Recalculate from the swap amount if available
                                    const fallbackEth = Math.min(0.001, swapAmount / currentPrice);
                                    txParams.value = window.web3.utils.toHex(window.web3.utils.toWei(fallbackEth.toString(), 'ether'));
                                    console.log(`Using calculated fallback ETH amount for SELL notification: ${fallbackEth} ETH`);
                                } catch (fallbackError) {
                                    // If even that fails, use absolute minimum
                                    txParams.value = window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether'));
                                    console.log(`Falling back to absolute minimum for SELL notification: ${fallbackError.message}`);
                                }
                            } else {
                                // Default fallback
                                txParams.value = window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether'));
                                console.log(`Falling back to test amount for SELL notification: ${valueError.message}`);
                            }
                        }
                    } else {
                        // Fallback if parsing failed
                        txParams.value = window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether'));
                        console.log(`Falling back to test amount for SELL notification`);
                    }
                }
                
                // Add appropriate gas parameters based on the network
                if (isEthereum) {
                    // Ethereum mainnet uses EIP-1559
                    if (maxFeePerGas && maxPriorityFeePerGas) {
                        txParams.maxFeePerGas = window.web3.utils.toHex(maxFeePerGas);
                        txParams.maxPriorityFeePerGas = window.web3.utils.toHex(maxPriorityFeePerGas);
                    } else {
                        txParams.gasPrice = window.web3.utils.toHex(gasPrice);
                    }
                } else if (isLinea) {
                    // Linea uses EIP-1559
                    if (maxFeePerGas && maxPriorityFeePerGas) {
                        txParams.maxFeePerGas = window.web3.utils.toHex(maxFeePerGas);
                        txParams.maxPriorityFeePerGas = window.web3.utils.toHex(maxPriorityFeePerGas);
                    } else {
                        txParams.gasPrice = window.web3.utils.toHex(gasPrice);
                    }
                } else {
                    // Fallback for other networks
                    txParams.gasPrice = window.web3.utils.toHex(gasPrice);
                }
                
                await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [txParams],
                });
                
                console.log("Wallet notification transaction sent successfully");
            } catch (txError) {
                // User may have rejected the transaction, which is fine
                console.log("User declined the wallet notification transaction", txError);
            }
        } else {
            // When Actionable Recommendations is disabled, we don't need to do anything extra
            // The browser notification has already been shown above
            console.log("Only browser notification shown (actionable recommendations not enabled)");
        }
        
        // Update model stats after notification
        updateModelStatsForWallet();
        // Fetch updated wallet stats
        fetchWalletStats();
        
        return;
    } catch (error) {
        console.error("Error in sendWalletNotification:", error);
        // Show a fallback notification
        showNotification(`Error processing ${signalType} signal: ${error.message}`, 'error');
    }
}

/**
 * Record wallet action to the database
 * @param {string} action - The action to record (BUY, SELL, HOLD)
 * @returns {Promise<Object|null>} - Promise resolving to the response data or null on error
 */
async function recordWalletAction(action) {
    if (!window.userAccount) return null;
    
    try {
        // Verify we have valid price data first
        if (!window.walletBalances.ethusd || isNaN(window.walletBalances.ethusd) || window.walletBalances.ethusd <= 0) {
            console.warn("Cannot record wallet action: ETH price data unavailable");
            return null;
        }
        
        // Calculate ETH allocation
        const ethValueUSD = window.walletBalances.eth * window.walletBalances.ethusd;
        const totalValue = window.walletBalances.totalValueUSD || ethValueUSD;
        const currentEthAllocation = totalValue > 0 ? (ethValueUSD / totalValue * 100) : 0;
        
        // Get current chain ID
        const chainId = await window.web3.eth.getChainId();
        
        // Send action to server to be recorded
        const response = await fetch('/api/set-wallet-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                wallet_address: window.userAccount,
                wallet_action: action,
                eth_balance: window.walletBalances.eth,
                usdc_balance: window.walletBalances.usdc,
                eth_allocation: currentEthAllocation,
                network: chainId === 59144 ? 'linea' : 'ethereum'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("Wallet action recorded successfully:", data);
            return data;
        } else {
            console.warn("Failed to record wallet action:", response.status);
            return null;
        }
    } catch (error) {
        console.error("Error recording wallet action:", error);
        return null;
    }
}

// Make functions available globally
window.requestNotificationPermission = requestNotificationPermission;
window.sendWalletNotification = sendWalletNotification;
window.recordWalletAction = recordWalletAction; 