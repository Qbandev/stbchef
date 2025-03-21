// Notification management functions for Simple Crypto Trading Bot Chef

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
        console.log(`Sending wallet notification for ${signalType} signal to ${userAccount}`);
        
        // Get current wallet balances and validate
        const ethBalance = walletBalances.eth || 0;
        const usdcBalance = walletBalances.usdc || 0;
        const currentPrice = walletBalances.ethusd || 0;
        
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
        
        // Record this wallet action in the database
        await recordWalletAction(signalType);
        
        // Lower minimum transaction amount for micro-balances
        // Set minimum to the lower of 0.001 ETH or 25% of available balance (with safety check)
        const MIN_ETH_TRANSACTION = ethBalance > 0 ? Math.min(0.001, ethBalance * 0.25) : 0;
        const MIN_USDC_TRANSACTION = usdcBalance > 0 ? Math.min(0.5, usdcBalance * 0.25) : 0;
        
        console.log(`Processing ${signalType} signal with balances: ${ethBalance} ETH, ${usdcBalance} USDC`);
        console.log(`Minimum transactions: ${MIN_ETH_TRANSACTION} ETH, ${MIN_USDC_TRANSACTION} USDC`);
        
        // Create a notification message to send to the wallet
        if (signalType === 'BUY' && usdcBalance > 0) {
            // For BUY signal, suggest using USDC to buy ETH
            const usdcToUse = usdcBalance > 0.5 ? Math.max(usdcBalance * 0.05, MIN_USDC_TRANSACTION) : usdcBalance * 0.9;
            
            // Safety check: ensure values are valid
            if (usdcToUse <= 0 || currentPrice <= 0) {
                console.log("Invalid USDC or price values for BUY calculation");
                showNotification(`BUY signal received - Unable to calculate conversion amounts`, 'warning');
                return;
            }
            
            const ethEquivalent = usdcToUse / currentPrice;
            
            // Show a notification about the suggested swap
            showNotification(`Suggested action: Convert ${usdcToUse.toFixed(2)} USDC to approximately ${ethEquivalent.toFixed(4)} ETH`, 'info');
            
            // Create and send a transaction to the wallet (this will just prompt the user, not execute automatically)
            try {
                // Prepare transaction parameters based on network support for EIP-1559
                let txParams = {
                    from: window.userAccount,
                    to: window.userAccount,
                    value: window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether')), // Small amount for visibility
                    data: window.web3.utils.toHex(message),
                    gas: gasLimit,
                };
                
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
                
                console.log("Wallet notification sent successfully");
                
                // Update model stats after notification
                updateModelStatsForWallet();
                // Fetch updated wallet stats
                fetchWalletStats();
            } catch (txError) {
                // User may have rejected the transaction, which is fine
                console.log("User declined the wallet notification transaction", txError);
            }
            
            return;
        } else if (signalType === 'SELL' && ethBalance > 0) {
            // For SELL signal, suggest selling ETH for USDC
            const ethToSell = ethBalance > 0.01 ? Math.max(ethBalance * 0.05, MIN_ETH_TRANSACTION) : ethBalance * 0.9;
            
            // Safety check: ensure values are valid
            if (ethToSell <= 0 || currentPrice <= 0) {
                console.log("Invalid ETH or price values for SELL calculation");
                showNotification(`SELL signal received - Unable to calculate conversion amounts`, 'warning');
                return;
            }
            
            const usdcEquivalent = ethToSell * currentPrice;
            
            // Show a notification about the suggested swap
            showNotification(`Suggested action: Convert ${ethToSell.toFixed(4)} ETH to approximately ${usdcEquivalent.toFixed(2)} USDC`, 'info');
            
            // Create and send a transaction to the wallet
            try {
                // Prepare transaction parameters based on network support for EIP-1559
                let txParams = {
                    from: window.userAccount,
                    to: window.userAccount,
                    value: window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether')), // Small amount for visibility
                    data: window.web3.utils.toHex(message),
                    gas: gasLimit,
                };
                
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
                
                console.log("Wallet notification sent successfully");
                
                // Update model stats after notification
                updateModelStatsForWallet();
                // Fetch updated wallet stats
                fetchWalletStats();
            } catch (txError) {
                console.log("User declined the wallet notification transaction", txError);
            }
            
            return;
        }
        
        // If we reached here, either not enough balance or just notification
        console.log(`Signal received (${signalType}), but no transaction suggestion created`);
        
        // Still try to send a simple notification transaction
        try {
            // Prepare transaction parameters based on network support for EIP-1559
            let txParams = {
                from: window.userAccount,
                to: window.userAccount,
                value: window.web3.utils.toHex(window.web3.utils.toWei('0.0001', 'ether')), // Small amount for visibility
                data: window.web3.utils.toHex(`${signalType} signal received - Check your portfolio allocation`),
                gas: gasLimit,
            };
            
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
            
            console.log("General wallet notification sent successfully");
            
            // Update model stats after notification
            updateModelStatsForWallet();
            // Fetch updated wallet stats
            fetchWalletStats();
        } catch (txError) {
            console.log("User declined the wallet notification transaction", txError);
        }
    } catch (error) {
        logToServer('error', 'Error processing wallet notification', error);
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
        if (!walletBalances.ethusd || isNaN(walletBalances.ethusd) || walletBalances.ethusd <= 0) {
            console.warn("Cannot record wallet action: ETH price data unavailable");
            return null;
        }
        
        // Calculate ETH allocation
        const ethValueUSD = walletBalances.eth * walletBalances.ethusd;
        const totalValue = walletBalances.totalValueUSD || ethValueUSD;
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
                eth_balance: walletBalances.eth,
                usdc_balance: walletBalances.usdc,
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