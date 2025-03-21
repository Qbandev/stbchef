// Wallet management functions for Simple Crypto Trading Bot Chef

// Global variables
window.savedWalletCardHTML = null;

/**
 * Format a wallet address for display, showing the first 6 characters and last 4
 * @param {string} address - The wallet address to format
 * @returns {string} Formatted address (e.g. "0x1234...5678")
 */
function formatWalletAddress(address) {
    if (!address) return '';
    
    // Validate the address - Ethereum addresses should be 42 chars (0x + 40 hex chars)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
        console.warn(`Invalid Ethereum address format: ${address}`);
        // Still attempt to format even if invalid, but in a safe way
        return address.length > 10 ? 
            `${address.slice(0, 6)}...${address.slice(-4)}` : address;
    }
    
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Persist wallet connection to localStorage
 * @param {string} account - The connected wallet account address
 */
function persistWalletConnection(account) {
    if (account) {
        localStorage.setItem(window.STORAGE_KEYS.WALLET, account);
    } else {
        localStorage.removeItem(window.STORAGE_KEYS.WALLET);
    }
}

/**
 * Update wallet UI based on connection status
 */
function updateWalletUI() {
    const walletBtn = document.getElementById('wallet-btn');
    if (window.userAccount) {
        walletBtn.innerHTML = `${formatWalletAddress(window.userAccount)} <i class="fas fa-sign-out-alt ml-2"></i>`;
        walletBtn.classList.add('connected');
        walletBtn.title = 'Click to disconnect wallet';
    } else {
        walletBtn.innerHTML = 'Connect Wallet';
        walletBtn.classList.remove('connected');
        walletBtn.title = 'Connect to MetaMask';
    }
}

/**
 * Show loading state in the wallet card
 * @param {string} message - Message to display during loading
 */
function showLoadingWalletState(message = "Loading wallet data...") {
    const walletCard = document.getElementById('wallet-card');
    
    if (walletCard) {
        // Save the previous HTML only if we haven't already saved it
        if (!window.savedWalletCardHTML && walletCard.innerHTML.length > 0) {
            window.savedWalletCardHTML = walletCard.innerHTML;
        }
        
        // Replace the entire card content with loading state
        walletCard.innerHTML = `
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    ${window.userAccount ? `
                    <div class="network-address-badge flex items-center bg-cyber-dark rounded-full px-2 py-1 border border-opacity-30 border-blue-400 hover:shadow-glow transition-all duration-300">
                        <div class="network-icon-container mr-2 relative overflow-hidden">
                            <svg class="w-5 h-5 text-blue-400 animate-pulse-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 blur-sm network-scan"></div>
                        </div>
                        <div class="flex flex-col">
                            <div class="text-xs text-blue-400 font-medium">Processing</div>
                            <div class="flex items-center">
                                <span class="wallet-address text-xs font-mono bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent transition-all duration-300">${formatWalletAddress(window.userAccount)}</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="flex flex-col items-center justify-center min-h-[200px] py-6">
                    <div class="cyber-spinner mb-4"></div>
                    <p class="text-blue-400 font-medium animate-pulse-slow">${message}</p>
                    <p class="text-xs text-gray-500 mt-2 text-center max-w-xs">Please wait while we update your wallet information</p>
                </div>
            </div>
        `;
    }
}

/**
 * Update the connected network display in the UI
 * @param {number} chainId - The current chain ID
 */
function updateConnectedNetwork(chainId) {
    const networkBadge = document.getElementById('network-badge');
    
    if (networkBadge) {
        let networkName = 'Unknown Network';
        let networkClass = 'bg-gray-800';
        
        switch (chainId) {
            case 1:
                networkName = 'Ethereum';
                networkClass = 'bg-blue-900';
                break;
            case 59144:
                networkName = 'Linea';
                networkClass = 'bg-purple-900';
                break;
            case 137:
                networkName = 'Polygon';
                networkClass = 'bg-indigo-900';
                break;
            case 10:
                networkName = 'Optimism';
                networkClass = 'bg-red-900';
                break;
            case 42161:
                networkName = 'Arbitrum';
                networkClass = 'bg-blue-800';
                break;
            case 56:
                networkName = 'BNB Chain';
                networkClass = 'bg-yellow-800';
                break;
            default:
                // Keep default values
                break;
        }
        
        // Update the badge
        networkBadge.textContent = networkName;
        
        // Remove all background classes and add the correct one
        networkBadge.className = networkBadge.className
            .replace(/bg-\w+-\d+/g, '')
            .trim() + ' ' + networkClass;
            
        // Make sure the badge is visible
        networkBadge.classList.remove('hidden');
    }
    
    // Restore wallet card content if it was in loading state
    const walletCard = document.getElementById('wallet-card');
    
    if (walletCard) {
        // If we have saved wallet card HTML, restore it
        if (window.savedWalletCardHTML) {
            walletCard.innerHTML = window.savedWalletCardHTML;
            window.savedWalletCardHTML = null;
        }
        
        // Then update with fresh data
        updateWalletCard();
    }
}

/**
 * Load persisted trading history from localStorage
 */
function loadPersistedHistory() {
    try {
        // Only load persisted history if wallet is connected
        if (!window.userAccount) {
            window.displayEmptyStats();
            return;
        }
        
        const history = localStorage.getItem(window.STORAGE_KEYS.TRADE_HISTORY);
        const performance = localStorage.getItem(window.STORAGE_KEYS.MODEL_PERFORMANCE);

        if (history) {
            window.tradeHistory = JSON.parse(history);
        }
        if (performance) {
            window.aiAccuracy = JSON.parse(performance);
        }

        // Update UI with loaded data
        window.updateModelStatsDisplay();
    } catch (error) {
        console.error('Error loading persisted history:', error);
    }
}

/**
 * Persist trading history to localStorage
 */
function persistTradingHistory() {
    try {
        localStorage.setItem(window.STORAGE_KEYS.TRADE_HISTORY, JSON.stringify(window.tradeHistory));
        localStorage.setItem(window.STORAGE_KEYS.MODEL_PERFORMANCE, JSON.stringify(window.aiAccuracy));
        localStorage.setItem('stbchef_raw_accuracy', JSON.stringify(window.aiRawAccuracy));
        localStorage.setItem(window.STORAGE_KEYS.LAST_UPDATE, Date.now().toString());
    } catch (error) {
        console.error('Error persisting history:', error);
    }
}

/**
 * Clear expired data from localStorage (older than 24 hours)
 */
function clearExpiredData() {
    const lastUpdate = parseInt(localStorage.getItem(window.STORAGE_KEYS.LAST_UPDATE) || '0');
    if (Date.now() - lastUpdate > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(window.STORAGE_KEYS.TRADE_HISTORY);
        localStorage.removeItem(window.STORAGE_KEYS.MODEL_PERFORMANCE);
        localStorage.removeItem(window.STORAGE_KEYS.LAST_UPDATE);
        localStorage.removeItem(window.STORAGE_KEYS.PRICE_DATA);
        localStorage.removeItem(window.STORAGE_KEYS.VOLUME_DATA);
        localStorage.removeItem(window.STORAGE_KEYS.TIME_LABELS);
    }
}

/**
 * Update wallet card with current balances and portfolio recommendations
 */
function updateWalletCard() {
    const walletCard = document.getElementById('wallet-card');
    if (!walletCard) return;
    
    if (!window.userAccount || !window.web3) {
        walletCard.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full">
                <p class="text-gray-400 mb-2">Connect your wallet to see balances</p>
            </div>
        `;
        return;
    }
    
    // Check if we have valid price data
    const hasValidPrice = window.walletBalances && window.walletBalances.ethusd && 
                         !isNaN(window.walletBalances.ethusd) && window.walletBalances.ethusd > 0;
    
    // Check if we're on Linea network
    window.web3.eth.getChainId().then(chainId => {
        const isLinea = chainId === 59144;
        const isEthereum = chainId === 1;
        const networkName = isLinea ? 'Linea' : isEthereum ? 'Ethereum' : 'Unknown Network';
        const networkClass = isLinea || isEthereum ? 'text-green-400' : 'text-yellow-400';
        
        // Network switching buttons
        const switchNetworkButtons = isLinea || isEthereum ? `
            <div class="col-span-2 mt-3 flex justify-center space-x-4">
                <button onclick="${isEthereum ? 'void(0)' : 'switchNetwork(1)'}" class="network-btn ${isEthereum ? 'network-active cursor-not-allowed opacity-80' : ''} flex items-center">
                    <div class="network-icon eth-icon">
                        <svg class="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                        </svg>
                    </div>
                    <span>Ethereum</span>
                    ${isEthereum ? '<span class="active-indicator">●</span>' : ''}
                </button>
                <button onclick="${isLinea ? 'void(0)' : 'switchNetwork(59144)'}" class="network-btn ${isLinea ? 'network-active cursor-not-allowed opacity-80' : ''} flex items-center">
                    <div class="network-icon linea-icon">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                            <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                            <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                            <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                        </svg>
                    </div>
                    <span>Linea</span>
                    ${isLinea ? '<span class="active-indicator">●</span>' : ''}
                </button>
            </div>
        ` : `
            <div class="col-span-2 mt-3">
                <div class="text-yellow-400 text-xs text-center mb-2">Switch to a supported network</div>
                <div class="flex justify-center space-x-4">
                    <button onclick="switchNetwork(1)" class="network-btn flex items-center">
                        <div class="network-icon eth-icon">
                            <svg class="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                            </svg>
                        </div>
                        <span>Ethereum</span>
                    </button>
                    <button onclick="switchNetwork(59144)" class="network-btn flex items-center">
                        <div class="network-icon linea-icon">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                                <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                                <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                                <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                            </svg>
                        </div>
                        <span>Linea</span>
                    </button>
                </div>
            </div>
        `;
        
        // If we don't have a valid ETH price, show error and don't make calculations
        if (!hasValidPrice) {
            walletCard.innerHTML = `
                <div class="p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                        <div class="network-address-badge flex items-center bg-cyber-dark rounded-full px-2 py-1 border border-opacity-30 ${isLinea ? 'border-blue-400' : isEthereum ? 'border-indigo-400' : 'border-yellow-400'} hover:shadow-glow transition-all duration-300">
                            ${isLinea ? `
                                <div class="network-icon-container mr-2 relative overflow-hidden">
                                    <svg class="w-5 h-5 text-blue-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                                        <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                                        <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                                        <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                                    </svg>
                                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 blur-sm network-scan"></div>
                                </div>
                            ` : isEthereum ? `
                                <div class="network-icon-container mr-2 relative overflow-hidden">
                                    <!-- Note: Ethereum icon uses 32x32 viewBox intentionally for correct proportions, 
                                         while still constrained to w-5 h-5 display size like other icons -->
                                    <svg class="w-5 h-5 text-indigo-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                                    </svg>
                                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-30 blur-sm network-scan"></div>
                                </div>
                            ` : `
                                <div class="network-icon-container mr-2 relative overflow-hidden">
                                    <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            `}
                            <div class="flex flex-col">
                                <div class="text-xs ${isLinea ? 'text-blue-400' : isEthereum ? 'text-indigo-400' : 'text-yellow-400'} font-medium network-name">${networkName}</div>
                                <div class="flex items-center">
                                    <span class="wallet-address text-xs font-mono bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent transition-all duration-300">${formatWalletAddress(window.userAccount)}</span>
                                    <button onclick="copyToClipboard('${window.userAccount}')" class="ml-1 text-gray-400 hover:text-blue-400 transition-colors duration-200">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <div class="text-gray-400">ETH Balance:</div>
                            <div class="font-bold text-cyber-text">${window.walletBalances.eth.toFixed(4)} ETH</div>
                            <div class="text-xs text-gray-400">${!isLinea && !isEthereum ? '(Only available on Linea or Ethereum)' : ''}</div>
                        </div>
                        <div>
                            <div class="text-gray-400">USDC Balance:</div>
                            <div class="font-bold text-cyber-text">${window.walletBalances.usdc.toFixed(2)} USDC</div>
                            <div class="text-xs text-gray-400">${!isLinea && !isEthereum ? '(Only available on Linea or Ethereum)' : ''}</div>
                        </div>
                        ${switchNetworkButtons}
                        <div class="col-span-2 mt-3 text-center">
                            <p class="text-yellow-400">Wallet portfolio analysis paused</p>
                            <p class="text-xs text-gray-400 mt-1">Portfolio recommendations will resume once data is available</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Calculate optimal action based on current portfolio allocation
        const ethValue = window.walletBalances.eth || 0;
        const usdcValue = window.walletBalances.usdc || 0;
        const ethPrice = window.walletBalances.ethusd || 0;
        
        const ethValueUSD = ethValue * ethPrice;
        const totalValue = (ethValueUSD + usdcValue) || 0;
        
        // Handle zero balance case properly with additional validation
        const hasNonZeroBalance = (ethValue > 0 || usdcValue > 0) && totalValue > 0;
        const currentEthAllocation = hasNonZeroBalance ? Math.min(100, Math.max(0, (ethValueUSD / totalValue * 100))) : 0;
        const currentUsdcAllocation = hasNonZeroBalance ? Math.min(100, Math.max(0, 100 - currentEthAllocation)) : 0;
        
        // Target allocation range: 60-80% ETH in bullish, 20-40% in bearish
        const marketSentiment = document.getElementById('sentiment');
        const isBullish = marketSentiment && marketSentiment.textContent.includes('bullish');
        
        const targetEthMin = isBullish ? 60 : 20;
        const targetEthMax = isBullish ? 80 : 40;
        
        // Instead of portfolio-based decision, use AI consensus or latest decisions if available
        let recommendedAction = 'HOLD';
        let swapAmount = 0;
        let swapDirection = '';
        
        // Get decisions from AI models
        const geminiDecision = document.getElementById('gemini-decision');
        const groqDecision = document.getElementById('groq-decision');
        const mistralDecision = document.getElementById('mistral-decision');
        
        const decisions = {
            gemini: geminiDecision ? geminiDecision.textContent : null,
            groq: groqDecision ? groqDecision.textContent : null,
            mistral: mistralDecision ? mistralDecision.textContent : null
        };
        
        // Check for consensus
        const aiConsensus = window.checkLLMConsensus(decisions);
        
        // Check for severe portfolio imbalance first
        const severeImbalanceThreshold = 10; // 10% threshold for severe imbalance
        
        if (totalValue > 0) {
            if (currentEthAllocation < targetEthMin - severeImbalanceThreshold) {
                // Severe imbalance - too little ETH regardless of consensus
                recommendedAction = 'BUY';
                const targetEthValue = (totalValue * targetEthMin / 100);
                swapAmount = targetEthValue - ethValueUSD;
                swapDirection = 'USDC → ETH';
            } else if (currentEthAllocation > targetEthMax + severeImbalanceThreshold) {
                // Severe imbalance - too much ETH regardless of consensus
                recommendedAction = 'SELL';
                const targetEthValue = (totalValue * targetEthMax / 100);
                swapAmount = ethValueUSD - targetEthValue;
                swapDirection = 'ETH → USDC';
            } else if (aiConsensus) {
                // For moderate imbalance, use consensus if available
                recommendedAction = aiConsensus;
                
                // Calculate swap amount based on consensus
                if (recommendedAction === 'BUY' && currentEthAllocation < targetEthMin) {
                    const targetEthValue = (totalValue * targetEthMin / 100);
                    swapAmount = targetEthValue - ethValueUSD;
                    swapDirection = 'USDC → ETH';
                } else if (recommendedAction === 'SELL' && currentEthAllocation > targetEthMax) {
                    const targetEthValue = (totalValue * targetEthMax / 100);
                    swapAmount = ethValueUSD - targetEthValue;
                    swapDirection = 'ETH → USDC';
                }
            } else {
                // Fall back to portfolio-based recommendation if no consensus 
                // and no severe imbalance
                if (currentEthAllocation < targetEthMin) {
                    recommendedAction = 'BUY';
                    const targetEthValue = (totalValue * targetEthMin / 100);
                    swapAmount = targetEthValue - ethValueUSD;
                    swapDirection = 'USDC → ETH';
                } else if (currentEthAllocation > targetEthMax) {
                    recommendedAction = 'SELL';
                    const targetEthValue = (totalValue * targetEthMax / 100);
                    swapAmount = ethValueUSD - targetEthValue;
                    swapDirection = 'ETH → USDC';
                }
            }
        }
        
        // Get recommending models
        let recommendingModels = [];
        if (decisions.gemini === recommendedAction) recommendingModels.push('Gemini');
        if (decisions.groq === recommendedAction) recommendingModels.push('Groq');
        if (decisions.mistral === recommendedAction) recommendingModels.push('Mistral');
        
        const modelText = recommendingModels.length > 0 
            ? `<div class="text-xs mt-1 text-gray-300">Recommended by: ${recommendingModels.join(', ')}</div>` 
            : '';
        
        // Modify the portfolio allocation bar display for zero balances
        const portfolioAllocationBar = hasNonZeroBalance 
            ? `<div class="w-full bg-gray-700 rounded-full h-2.5 mt-1 relative">
                <div class="${window.getPortfolioBarColor(currentEthAllocation, targetEthMin, targetEthMax)} h-2.5 rounded-full" style="width: ${currentEthAllocation}%"></div>
                
                <!-- Target range indicators -->
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMin}%; height: 100%;"></div>
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMax}%; height: 100%;"></div>
              </div>
              <div class="flex justify-between text-xs mt-1">
                <span>ETH: ${currentEthAllocation.toFixed(1)}%</span>
                <span>USDC: ${currentUsdcAllocation.toFixed(1)}%</span>
              </div>`
            : `<div class="w-full bg-gray-700 rounded-full h-2.5 mt-1 relative">
                <div class="bg-gray-600 h-2.5 rounded-full" style="width: 0%"></div>
                
                <!-- Target range indicators -->
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMin}%; height: 100%;"></div>
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMax}%; height: 100%;"></div>
              </div>
              <div class="flex justify-center text-xs mt-1">
                <span class="text-gray-400">(Empty Portfolio)</span>
              </div>`;
        
        // Recommendation section based on whether we have balances and AI decisions
        const recommendationSection = `
            <div class="col-span-2 mt-3 mb-1 space-y-2">
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Recommended Action:</span>
                    <span class="font-bold ${
                        recommendedAction === 'BUY' ? 'text-green-400' :
                        recommendedAction === 'SELL' ? 'text-red-400' :
                        'text-blue-400'
                    }">${recommendedAction}</span>
                </div>
                ${recommendingModels.length > 0 ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Recommended by:</span>
                    <span class="text-gray-300">${recommendingModels.join(', ')}</span>
                </div>
                ` : ''}
                ${swapAmount > 0 ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Suggested Swap:</span>
                    <span class="text-gray-300">~$${swapAmount.toFixed(2)} ${swapDirection}</span>
                </div>
                ` : ''}
                ${totalValue > 0 ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Target Allocation:</span>
                    <span class="text-gray-300">${targetEthMin}%-${targetEthMax}% ETH in ${isBullish ? 'bullish' : 'bearish'} market</span>
                </div>
                ` : ''}
                ${(currentEthAllocation < targetEthMin - severeImbalanceThreshold || currentEthAllocation > targetEthMax + severeImbalanceThreshold) && totalValue > 0 ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Warning:</span>
                    <span class="text-yellow-400">Portfolio significantly ${currentEthAllocation < targetEthMin ? 'below' : 'above'} target range</span>
                </div>
                ` : ''}
            </div>
        `;
        
        walletCard.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    <div class="network-address-badge flex items-center bg-cyber-dark rounded-full px-2 py-1 border border-opacity-30 ${isLinea ? 'border-blue-400' : isEthereum ? 'border-indigo-400' : 'border-yellow-400'} hover:shadow-glow transition-all duration-300">
                        ${isLinea ? `
                            <div class="network-icon-container mr-2 relative overflow-hidden">
                                <svg class="w-5 h-5 text-blue-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                                    <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                                    <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                                    <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                                </svg>
                                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 blur-sm network-scan"></div>
                            </div>
                        ` : isEthereum ? `
                            <div class="network-icon-container mr-2 relative overflow-hidden">
                                <!-- Note: Ethereum icon uses 32x32 viewBox intentionally for correct proportions, 
                                     while still constrained to w-5 h-5 display size like other icons -->
                                <svg class="w-5 h-5 text-indigo-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                                </svg>
                                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-30 blur-sm network-scan"></div>
                            </div>
                        ` : `
                            <div class="network-icon-container mr-2 relative overflow-hidden">
                                <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        `}
                        <div class="flex flex-col">
                            <div class="text-xs ${isLinea ? 'text-blue-400' : isEthereum ? 'text-indigo-400' : 'text-yellow-400'} font-medium network-name">${networkName}</div>
                            <div class="flex items-center">
                                <span class="wallet-address text-xs font-mono bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent transition-all duration-300">${formatWalletAddress(window.userAccount)}</span>
                                <button onclick="copyToClipboard('${window.userAccount}')" class="ml-1 text-gray-400 hover:text-blue-400 transition-colors duration-200">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <div class="text-gray-400">ETH Balance:</div>
                        <div class="font-bold text-cyber-text">${ethValue.toFixed(4)} ETH</div>
                        <div class="text-xs text-gray-400">$${(ethValue * ethPrice).toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">USDC Balance:</div>
                        <div class="font-bold text-cyber-text">${usdcValue.toFixed(2)} USDC</div>
                        <div class="text-xs text-gray-400">${!isLinea && !isEthereum ? '(Only available on Linea or Ethereum)' : ''}</div>
                    </div>
                    
                    <div class="col-span-2 mt-2">
                        <div class="text-gray-400">Portfolio Allocation:</div>
                        ${portfolioAllocationBar}
                    </div>
                    
                    ${switchNetworkButtons}
                    
                    ${recommendationSection}
                </div>
            </div>
        `;
    }).catch(err => {
        console.log("Error getting chain ID:", err.message);
        
        // Fallback wallet card with error state
        walletCard.innerHTML = `
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    ${window.userAccount ? `
                    <div class="network-address-badge flex items-center bg-cyber-dark rounded-full px-2 py-1 border border-opacity-30 border-yellow-400 hover:shadow-glow transition-all duration-300">
                        <div class="network-icon-container mr-2 relative overflow-hidden">
                            <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div class="flex flex-col">
                            <div class="text-xs text-yellow-400 font-medium">Connection Issue</div>
                            <div class="flex items-center">
                                <span class="wallet-address text-xs font-mono bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent transition-all duration-300">${formatWalletAddress(window.userAccount)}</span>
                                <button onclick="copyToClipboard('${window.userAccount}')" class="ml-1 text-gray-400 hover:text-blue-400 transition-colors duration-200">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="flex flex-col items-center justify-center h-24">
                    <p class="text-red-400 mb-2">Error loading wallet data</p>
                    <p class="text-xs text-gray-400 mb-2">Network error: ${err.message}</p>
                    <button onclick="getWalletBalances()" class="cyber-btn mt-2 text-xs px-3 py-1">
                        <i class="fas fa-sync-alt mr-1"></i> Retry
                    </button>
                </div>
            </div>
        `;
    });
}

// Initialize wallet balances
window.walletBalances = {
    eth: 0,
    usdc: 0,
    ethusd: 0, // Current ETH/USD price
    totalValueUSD: 0
};

/**
 * Get wallet balances for ETH and USDC
 * @returns {Promise} Promise that resolves when balances are fetched
 */
async function getWalletBalances() {
    if (!window.userAccount || !window.web3) {
        console.log("No wallet connection available");
        resetWalletBalances();
        return;
    }
    
    try {
        console.log("Fetching wallet balances for", window.userAccount);
        
        // Show loading state while fetching wallet data
        showLoadingWalletState("Retrieving wallet balances...");
        
        // Get current network ID with timeout
        let chainId;
        try {
            const timeout = ms => new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Chain ID request timed out')), ms));
            
            chainId = await Promise.race([
                window.web3.eth.getChainId(),
                timeout(3000) // 3 second timeout
            ]);
            console.log("Current chain ID:", chainId);
        } catch (chainError) {
            console.log("Error getting chain ID:", chainError.message);
            chainId = 0; // Use 0 as "unknown network"
            
            // Update loading state to show network issue
            showLoadingWalletState("Network detection issue - please check MetaMask");
        }
        
        // Check if we're on Linea (Chain ID 59144) or Ethereum (Chain ID 1)
        const isLinea = chainId === 59144;
        const isEthereum = chainId === 1;
        const isSupportedNetwork = isLinea || isEthereum;
        
        if (!isSupportedNetwork) {
            showNotification(`Unsupported network (Chain ID: ${chainId}). Please switch to Linea or Ethereum mainnet.`, 'warning');
            console.log(`Unsupported network: ${chainId}`);
            
            // Update loading state to show network issue
            showLoadingWalletState("Connected to unsupported network - please switch");
        }
        
        // Get ETH balance
        const ethBalance = await window.web3.eth.getBalance(window.userAccount);
        window.walletBalances.eth = parseFloat(window.web3.utils.fromWei(ethBalance, 'ether'));
        console.log("ETH balance:", window.walletBalances.eth);
        
        // Only try to get USDC balance if we're on a supported network
        window.walletBalances.usdc = 0; // Default to 0
        
        if (isLinea) {
            // Update loading state to show token balance retrieval
            showLoadingWalletState("Retrieving Linea USDC balance...");
            
            // USDC on Linea
            const lineaUsdcAddress = '0x176211869cA2b568f2A7D4EE941E073a821EE1ff';
            try {
                await getTokenBalance(lineaUsdcAddress);
            } catch (contractError) {
                console.log("Error fetching Linea USDC balance:", contractError.message);
            }
        } else if (isEthereum) {
            // Update loading state to show token balance retrieval
            showLoadingWalletState("Retrieving Ethereum USDC balance...");
            
            // USDC on Ethereum Mainnet
            const ethUsdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
            try {
                await getTokenBalance(ethUsdcAddress);
            } catch (contractError) {
                console.log("Error fetching Ethereum USDC balance:", contractError.message);
            }
        }
        
        // Update loading state to show price data retrieval
        showLoadingWalletState("Retrieving ETH price data...");
        
        // Get ETH price from the UI - NEVER use a default price
        let validPriceFound = false;
        try {
            const priceText = document.getElementById('eth-price').textContent;
            if (priceText && priceText !== 'Error' && priceText !== 'Waiting for data...') {
                const parsedPrice = parseFloat(priceText.replace('$', '').trim());
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                    window.walletBalances.ethusd = parsedPrice;
                    console.log("ETH/USD price from UI:", window.walletBalances.ethusd);
                    validPriceFound = true;
                }
            }
            
            // If UI price failed, try the API directly
            if (!validPriceFound) {
                const response = await fetch('/api/trading-data');
                const data = await response.json();
                if (data && data.eth_price && !isNaN(parseFloat(data.eth_price)) && parseFloat(data.eth_price) > 0) {
                    window.walletBalances.ethusd = parseFloat(data.eth_price);
                    console.log("ETH/USD price from API:", window.walletBalances.ethusd);
                    validPriceFound = true;
                }
            }
        } catch (priceError) {
            console.log("Error getting ETH price:", priceError.message);
            validPriceFound = false;
        }
        
        if (!validPriceFound) {
            console.log("No valid ETH price available - cannot calculate wallet value");
            window.walletBalances.ethusd = 0;
            window.walletBalances.totalValueUSD = 0;
            
            // Show specific message about missing price data
            const walletCard = document.getElementById('wallet-card');
            if (walletCard) {
                walletCard.innerHTML = `
                    <div class="p-4">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                            <div class="flex items-center">
                                <span class="text-xs ${isLinea ? 'text-green-400' : isEthereum ? 'text-green-400' : 'text-yellow-400'} mr-2">
                                    Network: ${isLinea ? 'Linea' : isEthereum ? 'Ethereum' : 'Unknown'}
                                </span>
                                <span class="text-xs text-gray-400">${formatWalletAddress(window.userAccount)}</span>
                            </div>
                        </div>
                        <div class="flex flex-col">
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <div class="text-gray-400">ETH Balance:</div>
                                    <div class="font-bold text-cyber-text">${window.walletBalances.eth.toFixed(4)} ETH</div>
                                </div>
                                <div>
                                    <div class="text-gray-400">USDC Balance:</div>
                                    <div class="font-bold text-cyber-text">${window.walletBalances.usdc.toFixed(2)} USDC</div>
                                </div>
                            </div>
                            <div class="mt-4 text-center">
                                <p class="text-yellow-400">Waiting for ETH price data</p>
                                <p class="text-xs text-gray-400 mt-1">Wallet balances ready, but portfolio analysis requires price data</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            return;
        }
        
        // Calculate total wallet value only if we have a valid price
        window.walletBalances.totalValueUSD = (window.walletBalances.eth * window.walletBalances.ethusd) + window.walletBalances.usdc;
        console.log("ETH value in USD:", window.walletBalances.eth * window.walletBalances.ethusd);
        console.log("USDC value:", window.walletBalances.usdc);
        console.log("Total wallet value:", window.walletBalances.totalValueUSD, "USD");
        
        // Update UI
        updateWalletCard();
        updateModelStatsForWallet();
    } catch (error) {
        console.log("Error fetching wallet balances:", error.message);
        showNotification("Error fetching wallet balances: " + error.message, "error");
        
        // Show specific error message in wallet card
        const walletCard = document.getElementById('wallet-card');
        if (walletCard) {
            walletCard.innerHTML = `
                <div class="p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    </div>
                    <div class="flex flex-col items-center justify-center py-4">
                        <p class="text-red-400 mb-2">Error retrieving wallet data</p>
                        <p class="text-xs text-gray-400 text-center">${error.message}</p>
                        <button onclick="getWalletBalances()" class="cyber-btn mt-3 text-xs px-3 py-1">
                            <i class="fas fa-sync-alt mr-1"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
        // Don't reset wallet balances here, keep whatever was valid previously
    }
}

/**
 * Get token balance from contract
 * @param {string} tokenAddress - Address of token contract
 * @returns {Promise<number>} - Token balance
 */
async function getTokenBalance(tokenAddress) {
    try {
        console.log(`Attempting to fetch token balance for ${tokenAddress}`);
        
        // Define the ERC20 contract ABI
        const ERC20_ABI = [
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "symbol",
                "outputs": [{"name": "", "type": "string"}],
                "type": "function"
            }
        ];
        
        // Create contract instance with error checking
        let tokenContract;
        try {
            tokenContract = new window.web3.eth.Contract(ERC20_ABI, tokenAddress);
            
            // Check if methods and necessary functions exist on the contract
            if (!tokenContract.methods || typeof tokenContract.methods.symbol !== 'function') {
                console.log('Contract methods not properly initialized, creating fallback contract');
                // Create a properly structured contract to avoid errors
                tokenContract = {
                    methods: {
                        symbol: () => ({ call: async () => 'UNKNOWN' }),
                        decimals: () => ({ call: async () => '6' }),
                        balanceOf: (address) => ({ call: async () => '0' })
                    }
                };
            }
        } catch (contractError) {
            console.log(`Failed to create contract instance: ${contractError.message}`);
            // Create a fallback contract object with minimum required methods
            tokenContract = {
                methods: {
                    symbol: () => ({ call: async () => 'UNKNOWN' }),
                    decimals: () => ({ call: async () => '6' }),
                    balanceOf: (address) => ({ call: async () => '0' })
                }
            };
        }
        
        // Use shorter timeouts to avoid hanging
        const timeout = ms => new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Contract call timed out after ${ms}ms`)), ms));
        
        // First check if the contract responds at all with a simple call
        let isContractResponding = false;
        try {
            // Brief timeout for simple call
            const symbol = await Promise.race([
                tokenContract.methods.symbol().call(),
                timeout(2000)
            ]);
            console.log(`Contract ${tokenAddress} responds with symbol: ${symbol}`);
            isContractResponding = true;
        } catch (checkError) {
            console.log(`Contract not responding properly: ${checkError.message}`);
            // If contract is not responding, return 0 to avoid further errors
            if (checkError.message.includes("Returned values aren't valid") || 
                checkError.message.includes("Contract call timed out")) {
                window.walletBalances.usdc = 0;
                return 0;
            }
        }
        
        // If contract is responding, attempt the balance calls with shorter timeouts
        if (isContractResponding) {
            console.log(`Fetching decimals and balance from ${tokenAddress}`);
            let decimals, balance;
            
            try {
                // Try decimals first with short timeout
                decimals = await Promise.race([
                    tokenContract.methods.decimals().call(),
                    timeout(3000)
                ]);
                console.log(`Token decimals: ${decimals}`);
            } catch (decimalsError) {
                console.log(`Failed to get decimals: ${decimalsError.message}, using default value 6`);
                // Default to 6 decimals for USDC as fallback
                decimals = 6;
            }
            
            try {
                // Try balance next with short timeout
                balance = await Promise.race([
                    tokenContract.methods.balanceOf(window.userAccount).call(),
                    timeout(3000)
                ]);
                console.log(`Token balance (raw): ${balance}`);
            } catch (balanceError) {
                console.log(`Failed to get balance: ${balanceError.message}, using 0`);
                // Default to 0 balance as fallback
                balance = "0";
            }
            
            // Validate returned values with defensive programming
            if (balance === undefined || balance === null) {
                console.log("Received undefined/null balance, defaulting to 0");
                balance = "0";
            }
            
            if (decimals === undefined || decimals === null) {
                console.log("Received undefined/null decimals, defaulting to 6");
                decimals = 6;
            }
            
            // Parse values with error checking
            let decimalValue, balanceValue;
            try {
                decimalValue = parseInt(decimals);
                if (isNaN(decimalValue)) {
                    console.log("Invalid decimals value, defaulting to 6");
                    decimalValue = 6;
                }
            } catch (parseError) {
                console.log(`Error parsing decimals: ${parseError.message}, using default 6`);
                decimalValue = 6;
            }
            
            try {
                balanceValue = parseFloat(balance);
                if (isNaN(balanceValue)) {
                    console.log("Invalid balance value, defaulting to 0");
                    balanceValue = 0;
                }
            } catch (parseError) {
                console.log(`Error parsing balance: ${parseError.message}, using 0`);
                balanceValue = 0;
            }
            
            // Calculate final balance
            window.walletBalances.usdc = balanceValue / Math.pow(10, decimalValue);
            console.log(`USDC balance (formatted): ${window.walletBalances.usdc}`);
            return window.walletBalances.usdc;
        } else {
            // Contract is not responding, set USDC to 0
            window.walletBalances.usdc = 0;
            return 0;
        }
    } catch (error) {
        // Log less detailed error information to reduce console noise
        console.log("Token balance error:", error.message);
        
        // Set USDC to 0 on error
        window.walletBalances.usdc = 0;
        return 0;
    }
}

/**
 * Reset wallet balances to zero
 */
function resetWalletBalances() {
    window.walletBalances = {
        eth: 0,
        usdc: 0,
        ethusd: 0,
        totalValueUSD: 0
    };
    updateWalletCard();
    updateModelStatsForWallet();
}

/**
 * Connect to a wallet or disconnect if already connected
 * @returns {Promise<void>}
 */
async function connectWallet() {
    // If already connected, disconnect
    if (window.userAccount) {
        window.userAccount = null;
        window.web3 = null;
        resetWalletBalances();
        
        // Remove from localStorage to prevent auto-reconnect
        localStorage.removeItem(window.STORAGE_KEYS.WALLET);
        
        // Clear raw accuracy data from localStorage
        localStorage.removeItem('stbchef_raw_accuracy');
        
        // Reset raw accuracy tracking
        window.aiRawAccuracy = {
            gemini: { correct: 0, total: 0, accuracy: 0 },
            groq: { correct: 0, total: 0, accuracy: 0 },
            mistral: { correct: 0, total: 0, accuracy: 0 }
        };
        
        // Update UI
        updateWalletUI();
        
        // Clear model performance when disconnecting
        window.displayEmptyStats();
        
        // Update LLM decision cards to show "Connect wallet first"
        try {
            const tradingData = await fetch('/api/trading-data').then(res => res.json());
            window.updateModelDecisions(tradingData, null);
        } catch (error) {
            console.error('Error updating model decisions after disconnect:', error);
        }
        
        window.showNotification('Wallet disconnected', 'warning');
        return;
    }
    
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Show loading state on wallet button
            const walletBtn = document.getElementById('wallet-btn');
            if (walletBtn) {
                walletBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin mr-2"></i> Connecting...';
                walletBtn.classList.add('connecting');
            }
            
            // Request accounts
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts',
                params: []
            }).catch(error => {
                console.error('User denied account access:', error);
                
                // Reset wallet button
                if (walletBtn) {
                    walletBtn.innerHTML = 'Connect Wallet';
                    walletBtn.classList.remove('connecting');
                }
                
                window.showNotification('Failed to connect wallet', 'error');
                throw error;
            });
            
            if (!accounts || accounts.length === 0) {
                // Reset wallet button
                if (walletBtn) {
                    walletBtn.innerHTML = 'Connect Wallet';
                    walletBtn.classList.remove('connecting');
                }
                
                window.showNotification('No accounts found', 'error');
                return;
            }
            
            window.userAccount = accounts[0];
            window.web3 = new Web3(window.ethereum);

            // Check which network we're on
            const chainId = await window.web3.eth.getChainId();
            const isLinea = chainId === 59144;
            const isEthereum = chainId === 1;
            
            // Only show warning if on unsupported network, no need for confirmation on supported ones
            if (!isLinea && !isEthereum) {
                window.showNotification(`Connected to unsupported network (ID: ${chainId}). Please switch to Linea (ID: 59144) or Ethereum (ID: 1).`, 'warning');
            }

            // Save account immediately
            persistWalletConnection(window.userAccount);
            
            // Show loading state on wallet card
            const walletCard = document.getElementById('wallet-card');
            if (walletCard) {
                walletCard.innerHTML = `
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                        </div>
                        <div class="flex flex-col items-center justify-center h-24">
                            <p class="text-gray-400 mb-2">Loading wallet data...</p>
                            <div class="spinner"><i class="fas fa-sync-alt fa-spin"></i></div>
                        </div>
                    </div>
                `;
            }
            
            // Update UI before API calls
            updateWalletUI();
            
            try {
                // Get wallet balances after connecting
                await getWalletBalances();
            } catch (error) {
                console.error('Error fetching wallet balances:', error);
                window.showNotification('Connected, but could not fetch wallet balances', 'warning');
            }
            
            try {
                // Update model performance cards with wallet-specific data
                await window.fetchWalletStats();
            } catch (error) {
                console.error('Error fetching wallet stats:', error);
            }
            
            try {
                // Update LLM decision cards
                const tradingData = await fetch('/api/trading-data').then(res => res.json());
                window.updateModelDecisions(tradingData, window.userAccount);
            } catch (error) {
                console.error('Error updating model decisions:', error);
            }
            
            window.showNotification('Wallet connected successfully!', 'success');

            // Request notification permission after wallet connection
            await window.requestNotificationPermission();

            // Set up MetaMask event listeners
            setupMetaMaskEventListeners();

            // Handle account changes - only set up once
            if (!window.hasSetupMetaMaskEvents) {
                window.hasSetupMetaMaskEvents = true;
                
                // Store the current account for comparison
                window.lastKnownAccount = window.userAccount;

                // Handle account changes
                window.ethereum.on('accountsChanged', handleAccountsChanged);
                
                // Handle chain changes
                window.ethereum.on('chainChanged', function (chainIdHex) {
                    const newChainId = parseInt(chainIdHex, 16);
                    const isLinea = newChainId === 59144;
                    const isEthereum = newChainId === 1;
                    
                    // Only show warning if on unsupported network
                    if (!isLinea && !isEthereum) {
                        window.showNotification(`Switched to unsupported network (ID: ${newChainId}). 
                                        Please switch to Linea (ID: 59144) or Ethereum (ID: 1).`, 'warning');
                    }
                    
                    // Update wallet data
                    getWalletBalances().catch(error => 
                        console.error('Error fetching wallet balances after chain change:', error));
                    
                    // Update UI
                    updateWalletUI();
                    
                    // Update model stats and decisions
                    window.fetchWalletStats().catch(error => 
                        console.error('Error fetching wallet stats after chain change:', error));
                    
                    fetch('/api/trading-data')
                        .then(res => res.json())
                        .then(data => window.updateModelDecisions(data, window.userAccount))
                        .catch(error => console.error('Error updating model decisions:', error));
                    
                    // Get network name for notification
                    const networkName = isLinea ? 'Linea' : 
                                        isEthereum ? 'Ethereum' : 
                                        `Unknown Network (ID: ${newChainId})`;
                    
                    window.showNotification(`Network changed to ${networkName}`, 'info');
                });
                
                // Handle disconnect event
                window.ethereum.on('disconnect', function (error) {
                    console.log('MetaMask disconnected:', error);
                    
                    // Only clear if this is our current connection
                    if (window.userAccount) {
                        window.userAccount = null;
                        resetWalletBalances();
                        
                        // Remove from localStorage
                        localStorage.removeItem(window.STORAGE_KEYS.WALLET);
                        
                        // Clear raw accuracy data from localStorage
                        localStorage.removeItem('stbchef_raw_accuracy');
                        
                        // Reset raw accuracy tracking
                        window.aiRawAccuracy = {
                            gemini: { correct: 0, total: 0, accuracy: 0 },
                            groq: { correct: 0, total: 0, accuracy: 0 },
                            mistral: { correct: 0, total: 0, accuracy: 0 }
                        };
                        
                        // Update UI
                        updateWalletUI();
                        
                        // Update model stats and LLM decisions
                        window.displayEmptyStats();
                        fetch('/api/trading-data')
                            .then(res => res.json())
                            .then(data => window.updateModelDecisions(data, null))
                            .catch(error => console.error('Error updating model decisions:', error));
                        
                        window.showNotification('Wallet disconnected', 'warning');
                    }
                });
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            window.showNotification('Failed to connect wallet', 'error');
            
            // Reset wallet button
            const walletBtn = document.getElementById('wallet-btn');
            if (walletBtn) {
                walletBtn.innerHTML = 'Connect Wallet';
                walletBtn.classList.remove('connecting');
            }
        }
    } else {
        window.showNotification('Please install MetaMask!', 'error');
    }
}

/**
 * Switch to a different network for wallet connection
 * @param {number} chainId - The chain ID to switch to
 */
async function switchNetwork(chainId) {
    // Show feedback to user that we're switching networks
    const walletBtn = document.getElementById('wallet-btn');
    const originalText = walletBtn.textContent;
    walletBtn.textContent = 'Switching Network...';
    
    // Also show switching state in the wallet card
    showLoadingWalletState(`Switching to ${chainId === 1 ? 'Ethereum' : chainId === 59144 ? 'Linea' : `Network ID ${chainId}`}...`);
    
    try {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected');
        }
        
        // Attempt to switch to the requested network
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${chainId.toString(16)}` }],
            });
            console.log(`Successfully switched to network ${chainId}`);
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                try {
                    // Define network parameters based on chainId
                    let params;
                    if (chainId === 59144) { // Linea
                        params = [{
                            chainId: '0xe708',
                            chainName: 'Linea Mainnet',
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: ['https://rpc.linea.build'],
                            blockExplorerUrls: ['https://lineascan.build']
                        }];
                    } else {
                        throw new Error(`Network ${chainId} not supported for adding`);
                    }
                    
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: params,
                    });
                    console.log(`Added network ${chainId} to MetaMask`);
                } catch (addError) {
                    throw new Error(`Failed to add network: ${addError.message}`);
                }
            } else {
                throw new Error(`Failed to switch network: ${switchError.message}`);
            }
        }
        
        // Reset wallet connection status
        window.web3 = new Web3(window.ethereum);
        
        // Delay wallet balance check to allow network switch to complete
        setTimeout(async () => {
            try {
                // Verify we're on the right chain before proceeding
                const currentChainId = await window.web3.eth.getChainId();
                console.log(`Current chain ID: ${currentChainId}, expected: ${chainId}`);
                
                if (Number(currentChainId) === chainId) {
                    // Only update wallet balances if we're correctly on the requested network
                    try {
                        // Use a timeout to prevent hanging
                        const balanceUpdatePromise = getWalletBalances();
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Balance update timed out')), 5000);
                        });
                        
                        await Promise.race([balanceUpdatePromise, timeoutPromise]);
                        console.log('Wallet balances updated after network switch');
                    } catch (balanceError) {
                        console.log(`Could not update balances: ${balanceError.message}`);
                        // Continue anyway - we'll try again on the next update cycle
                    }
                    
                    // Update the connected network display
                    updateConnectedNetwork(chainId);
                } else {
                    console.log(`Network mismatch: wanted ${chainId}, got ${currentChainId}`);
                }
            } catch (error) {
                console.log(`Error after network switch: ${error.message}`);
            } finally {
                // Restore button text regardless of outcome
                walletBtn.textContent = originalText;
            }
        }, 2000); // Give time for network switch to stabilize
    } catch (error) {
        console.log(`Network switch error: ${error.message}`);
        window.showNotification('error', `Network switch failed: ${error.message}`);
        walletBtn.textContent = originalText;
    }
}

/**
 * Setup MetaMask event listeners
 * This function can be called multiple times but will only set up listeners once
 */
function setupMetaMaskEventListeners() {
    if (!window.ethereum) {
        console.log("Cannot setup MetaMask event listeners: ethereum not available");
        return;
    }

    // Use a safe synchronous check to avoid race conditions
    // First check if we're already in the process of setting up event listeners
    if (window.isSettingUpMetaMaskEvents) {
        console.log("MetaMask event listener setup already in progress");
        return;
    }
    
    // If already set up, exit early
    if (window.hasSetupMetaMaskEvents) {
        console.log("MetaMask event listeners already set up");
        return;
    }
    
    // Set flag to indicate setup is in progress (prevents race conditions)
    window.isSettingUpMetaMaskEvents = true;
    
    try {
        console.log("Setting up MetaMask event listeners");
        
        // Store the current account for comparison
        window.lastKnownAccount = window.userAccount;

        // Handle account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        
        // Handle chain changes
        window.ethereum.on('chainChanged', function (chainIdHex) {
            const newChainId = parseInt(chainIdHex, 16);
            const isLinea = newChainId === 59144;
            const isEthereum = newChainId === 1;
            
            // Only show warning if on unsupported network
            if (!isLinea && !isEthereum) {
                window.showNotification(`Switched to unsupported network (ID: ${newChainId}). 
                                Please switch to Linea (ID: 59144) or Ethereum (ID: 1).`, 'warning');
            }
            
            // Update wallet data
            getWalletBalances().catch(error => 
                console.error('Error fetching wallet balances after chain change:', error));
            
            // Update UI
            updateWalletUI();
            
            // Update model stats and decisions
            window.fetchWalletStats().catch(error => 
                console.error('Error fetching wallet stats after chain change:', error));
            
            fetch('/api/trading-data')
                .then(res => res.json())
                .then(data => window.updateModelDecisions(data, window.userAccount))
                .catch(error => console.error('Error updating model decisions:', error));
            
            // Get network name for notification
            const networkName = isLinea ? 'Linea' : 
                                isEthereum ? 'Ethereum' : 
                                `Unknown Network (ID: ${newChainId})`;
            
            window.showNotification(`Network changed to ${networkName}`, 'info');
        });
        
        // Handle disconnect event
        window.ethereum.on('disconnect', function (error) {
            console.log('MetaMask disconnected:', error);
            
            // Only clear if this is our current connection
            if (window.userAccount) {
                window.userAccount = null;
                resetWalletBalances();
                
                // Remove from localStorage
                localStorage.removeItem(window.STORAGE_KEYS.WALLET);
                
                // Clear raw accuracy data from localStorage
                localStorage.removeItem('stbchef_raw_accuracy');
                
                // Reset raw accuracy tracking
                window.aiRawAccuracy = {
                    gemini: { correct: 0, total: 0, accuracy: 0 },
                    groq: { correct: 0, total: 0, accuracy: 0 },
                    mistral: { correct: 0, total: 0, accuracy: 0 }
                };
                
                // Update UI
                updateWalletUI();
                
                // Update model stats and LLM decisions
                window.displayEmptyStats();
                fetch('/api/trading-data')
                    .then(res => res.json())
                    .then(data => window.updateModelDecisions(data, null))
                    .catch(error => console.error('Error updating model decisions:', error));
                
                window.showNotification('Wallet disconnected', 'warning');
            }
        });
        
        // Mark event listeners as successfully set up
        window.hasSetupMetaMaskEvents = true;
    } catch (error) {
        console.error('Error setting up MetaMask event listeners:', error);
    } finally {
        // Reset flag after setting up event listeners
        window.isSettingUpMetaMaskEvents = false;
    }
}

/**
 * Handle accounts changed event from MetaMask
 * @param {Array} accounts - Array of accounts from MetaMask
 */
function handleAccountsChanged(accounts) {
    console.log(`Accounts changed event received. Got ${accounts.length} accounts, current account: ${window.userAccount}, last known: ${window.lastKnownAccount}`);
    
    // No accounts - handle disconnect
    if (accounts.length === 0) {
        if (window.userAccount) {
            console.log('User disconnected wallet');
            window.userAccount = null;
            resetWalletBalances();
            
            // Remove from localStorage
            localStorage.removeItem(window.STORAGE_KEYS.WALLET);
            
            // Clear raw accuracy data from localStorage
            localStorage.removeItem('stbchef_raw_accuracy');
            
            // Reset raw accuracy tracking
            window.aiRawAccuracy = {
                gemini: { correct: 0, total: 0, accuracy: 0 },
                groq: { correct: 0, total: 0, accuracy: 0 },
                mistral: { correct: 0, total: 0, accuracy: 0 }
            };
            
            // Update UI
            updateWalletUI();
            
            // Update model stats and LLM decisions on disconnect
            window.displayEmptyStats();
            fetch('/api/trading-data')
                .then(res => res.json())
                .then(data => window.updateModelDecisions(data, null))
                .catch(error => console.error('Error updating model decisions:', error));
                
            window.showNotification('Wallet disconnected', 'warning');
        }
        return;
    }
    
    // Check if account actually changed
    const newAccount = accounts[0];
    if (newAccount === window.userAccount) {
        console.log('Account unchanged, no action needed');
        return;
    }
    
    console.log(`Account changed from ${window.userAccount || 'none'} to ${newAccount}`);
    
    // Update the last known account
    window.lastKnownAccount = window.userAccount;
    window.userAccount = newAccount;
    
    // Clear old raw accuracy data since we're connecting to a new wallet
    localStorage.removeItem('stbchef_raw_accuracy');
    
    // Reset raw accuracy tracking for new wallet
    window.aiRawAccuracy = {
        gemini: { correct: 0, total: 0, accuracy: 0 },
        groq: { correct: 0, total: 0, accuracy: 0 },
        mistral: { correct: 0, total: 0, accuracy: 0 }
    };
    
    // Save to localStorage
    persistWalletConnection(window.userAccount);
    
    // Update UI
    updateWalletUI();
    
    // Update wallet data
    getWalletBalances().catch(error => 
        console.error('Error fetching wallet balances after account change:', error));
    
    // Request permission for new account
    window.requestNotificationPermission().catch(error => 
        console.error('Error requesting notification permission:', error)); 
    
    // Update model stats and LLM decisions on account change
    window.fetchWalletStats().catch(error => 
        console.error('Error fetching wallet stats after account change:', error));
    
    fetch('/api/trading-data')
        .then(res => res.json())
        .then(data => window.updateModelDecisions(data, window.userAccount))
        .catch(error => console.error('Error updating model decisions:', error));
    
    // Show notification
    window.showNotification('Wallet account changed', 'info');
}

// Add document ready handler to set up MetaMask event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Attempt to set up MetaMask event listeners if ethereum is available
    if (typeof window.ethereum !== 'undefined') {
        console.log('Setting up MetaMask event listeners on page load');
        setupMetaMaskEventListeners();
    } else {
        console.log('MetaMask not detected on page load');
    }
});

// Make functions available globally
window.persistWalletConnection = persistWalletConnection;
window.updateWalletUI = updateWalletUI;
window.showLoadingWalletState = showLoadingWalletState;
window.updateConnectedNetwork = updateConnectedNetwork;
window.loadPersistedHistory = loadPersistedHistory;
window.persistTradingHistory = persistTradingHistory;
window.clearExpiredData = clearExpiredData;
window.updateWalletCard = updateWalletCard;
window.getWalletBalances = getWalletBalances;
window.getTokenBalance = getTokenBalance;
window.resetWalletBalances = resetWalletBalances;
window.connectWallet = connectWallet;
window.switchNetwork = switchNetwork;
window.setupMetaMaskEventListeners = setupMetaMaskEventListeners;
window.handleAccountsChanged = handleAccountsChanged;
window.formatWalletAddress = formatWalletAddress;