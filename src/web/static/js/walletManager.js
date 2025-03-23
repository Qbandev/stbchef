// Wallet management functions for Simple Crypto Trading Bot Chef

// Global variables
window.savedWalletCardHTML = null;

/**
 * Declaration for disconnectedAccounts
 */
window.disconnectedAccounts = [];

/**
 * Save the list of disconnected accounts to localStorage
 */
function saveDisconnectedAccounts() {
    try {
        localStorage.setItem('stbchef_disconnected_accounts', JSON.stringify(window.disconnectedAccounts));
        console.log(`Saved ${window.disconnectedAccounts.length} disconnected accounts to localStorage`);
    } catch (error) {
        console.error('Error saving disconnected accounts:', error);
    }
}

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
 * Persist wallet connection to the database
 * @param {string} account - The connected wallet account address
 */
function persistWalletConnection(account) {
    if (account) {
        // Save connected wallet to database
        fetch('/api/wallet/connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                wallet_address: account,
                is_connected: true
            })
        })
        .then(response => {
            if (!response.ok) {
                console.warn('Failed to update wallet connection status:', response.statusText);
                // Continue execution even if the server returns an error
            }
        })
        .catch(error => {
            // Log but don't throw to prevent breaking the app flow
            console.warn('Error persisting wallet connection (continuing anyway):', error);
        });
    } else {
        // Disconnect current wallet if any
        if (window.userAccount) {
            fetch('/api/wallet/connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wallet_address: window.userAccount,
                    is_connected: false
                })
            })
            .then(response => {
                if (!response.ok) {
                    console.warn('Failed to update wallet disconnection status:', response.statusText);
                    // Continue execution even if the server returns an error
                }
            })
            .catch(error => {
                // Log but don't throw to prevent breaking the app flow
                console.warn('Error persisting wallet disconnection (continuing anyway):', error);
            });
        }
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
    
    console.log(`Updating wallet card for account: ${window.userAccount || 'none'}`);
    
    if (!window.userAccount) {
        walletCard.innerHTML = `
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <div class="text-gray-400">ETH Balance:</div>
                        <div class="font-bold text-cyber-text">0.0000 ETH</div>
                        <div class="text-xs text-gray-400">$0.00</div>
                    </div>
                    <div>
                        <div class="text-gray-400">USDC Balance:</div>
                        <div class="font-bold text-cyber-text">0.00 USDC</div>
                    </div>
                    <div class="col-span-2 mt-2">
                        <div class="text-gray-400">Portfolio Allocation:</div>
                        <div class="w-full bg-gray-700 rounded-full h-2.5 mt-1 relative">
                            <div class="bg-gray-600 h-2.5 rounded-full" style="width: 0%"></div>
                            <!-- Target range indicators for empty portfolio -->
                            <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: 20%; height: 100%;"></div>
                            <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: 40%; height: 100%;"></div>
                        </div>
                        <div class="flex justify-center text-xs mt-1">
                            <span class="text-gray-400">ETH: 0.0% | USDC: 0.0%</span>
                        </div>
                    </div>
                    
                    <div class="col-span-2 mt-3 flex justify-center space-x-4">
                        <button class="network-btn opacity-50 cursor-not-allowed flex items-center">
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
                        <button class="network-btn opacity-50 cursor-not-allowed flex items-center">
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
                    <div class="col-span-2 mt-3 mb-1 space-y-2">
                        <div class="flex items-center">
                            <span class="text-gray-400 w-40">Recommended Action:</span>
                            <span class="font-bold text-xl cyber-value animate-pulse text-gray-400">Connect your wallet first</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    if (!window.web3) {
        console.log("No web3 instance available, but user account exists");
        // Try to initialize web3 if ethereum is available
        if (typeof window.ethereum !== 'undefined') {
            window.web3 = new Web3(window.ethereum);
        } else {
            // If still no web3, show empty wallet card with error message
            walletCard.innerHTML = `
                <div class="p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    </div>
                    <div class="flex flex-col items-center justify-center py-6">
                        <p class="text-red-400 mb-2">Web3 provider not available</p>
                        <p class="text-gray-400 text-sm mb-4">Please make sure MetaMask is installed and enabled</p>
                        <button onclick="window.location.reload()" class="cyber-btn text-xs px-3 py-1">
                            <i class="fas fa-sync-alt mr-1"></i> Refresh Page
                        </button>
                    </div>
                </div>
            `;
            return;
        }
    }

    // Check if we have valid price data
    const hasValidPrice = window.walletBalances && window.walletBalances.ethusd && 
                         !isNaN(window.walletBalances.ethusd) && window.walletBalances.ethusd > 0;
    
    // Log the current balances for debugging
    console.log(`Wallet balances for ${window.userAccount}:`, 
        JSON.stringify({
            eth: window.walletBalances.eth,
            usdc: window.walletBalances.usdc,
            ethusd: window.walletBalances.ethusd
        })
    );
    
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
                console.log(`Portfolio rebalance (BUY): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                swapDirection = 'USDC → ETH';
            } else if (currentEthAllocation > targetEthMax + severeImbalanceThreshold) {
                // Severe imbalance - too much ETH regardless of consensus
                recommendedAction = 'SELL';
                const targetEthValue = (totalValue * targetEthMax / 100);
                swapAmount = ethValueUSD - targetEthValue;
                console.log(`Portfolio rebalance (SELL): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                swapDirection = 'ETH → USDC';
            } else if (aiConsensus) {
                // For moderate imbalance, use consensus if available
                recommendedAction = aiConsensus;
                
                // Calculate swap amount based on consensus
                if (recommendedAction === 'BUY') {
                    // If already within range, make a balanced buy recommendation
                    if (currentEthAllocation >= targetEthMin && currentEthAllocation <= targetEthMax) {
                        // Calculate a moderate buy that moves 1/3 of the way from current to target max
                        const midPoint = (targetEthMax + currentEthAllocation) / 2;
                        const targetEthValue = (totalValue * midPoint / 100);
                        swapAmount = targetEthValue - ethValueUSD;
                        console.log(`LLM Consensus BUY (within range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${midPoint.toFixed(1)}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    } else if (currentEthAllocation < targetEthMin) {
                        // If below range, bring to minimum target
                        const targetEthValue = (totalValue * targetEthMin / 100);
                        swapAmount = targetEthValue - ethValueUSD;
                        console.log(`LLM Consensus BUY (below range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${targetEthMin}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    } else {
                        // If above range, no buy needed (this shouldn't happen for BUY)
                        swapAmount = 0;
                        console.log(`LLM Consensus BUY (unusual scenario): Current: ${currentEthAllocation.toFixed(1)}%, above target range, no swap needed`);
                    }
                    swapDirection = 'USDC → ETH';
                } else if (recommendedAction === 'SELL') {
                    // If already within range, make a balanced sell recommendation
                    if (currentEthAllocation >= targetEthMin && currentEthAllocation <= targetEthMax) {
                        // Calculate a moderate sell that moves 1/3 of the way from current to target min
                        const midPoint = (targetEthMin + currentEthAllocation) / 2;
                        const targetEthValue = (totalValue * midPoint / 100);
                        swapAmount = ethValueUSD - targetEthValue;
                        console.log(`LLM Consensus SELL (within range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${midPoint.toFixed(1)}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    } else if (currentEthAllocation > targetEthMax) {
                        // If above range, bring to maximum target
                        const targetEthValue = (totalValue * targetEthMax / 100);
                        swapAmount = ethValueUSD - targetEthValue;
                        console.log(`LLM Consensus SELL (above range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${targetEthMax}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    } else {
                        // If below range, no sell needed (this shouldn't happen for SELL)
                        swapAmount = 0;
                        console.log(`LLM Consensus SELL (unusual scenario): Current: ${currentEthAllocation.toFixed(1)}%, below target range, no swap needed`);
                    }
                    swapDirection = 'ETH → USDC';
                }
            } else {
                // Fall back to portfolio-based recommendation if no consensus 
                // and no severe imbalance
                if (currentEthAllocation < targetEthMin) {
                    recommendedAction = 'BUY';
                    const targetEthValue = (totalValue * targetEthMin / 100);
                    swapAmount = targetEthValue - ethValueUSD;
                    console.log(`Portfolio rebalance (BUY): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                    swapDirection = 'USDC → ETH';
                } else if (currentEthAllocation > targetEthMax) {
                    recommendedAction = 'SELL';
                    const targetEthValue = (totalValue * targetEthMax / 100);
                    swapAmount = ethValueUSD - targetEthValue;
                    console.log(`Portfolio rebalance (SELL): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                    swapDirection = 'ETH → USDC';
                }
            }
        }
        
        // Ensure swap amount is always positive and meaningful
        if (swapAmount < 0) {
            console.log(`Correcting negative swap amount (${swapAmount.toFixed(2)}) to 0`);
            swapAmount = 0;
        }
        
        // Minimum significant swap amount (to avoid dust trades)
        const MIN_SIGNIFICANT_SWAP = 0.10; // $0.10 minimum
        if (swapAmount > 0 && swapAmount < MIN_SIGNIFICANT_SWAP) {
            console.log(`Increasing tiny swap amount from ${swapAmount.toFixed(2)} to minimum ${MIN_SIGNIFICANT_SWAP}`);
            swapAmount = MIN_SIGNIFICANT_SWAP;
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
        
        // Only trigger notifications if we have a valid recommendation and sufficient imbalance
        if (recommendedAction !== 'HOLD' && swapAmount > 0) {
            // Check conditions based on specified rules:
            // 1. Portfolio is outside target range (trigger notification for rebalancing)
            const isPortfolioOutOfRange = (currentEthAllocation < targetEthMin || currentEthAllocation > targetEthMax);
            
            // 2. At least 2 LLMs agree on a BUY/SELL action
            const consensusModels = recommendingModels.length;
            const hasLLMConsensus = consensusModels >= 2;
            
            // Only send notification if:
            // - Portfolio is outside target range (for rebalancing) OR
            // - We have LLM consensus from at least 2 models
            if (isPortfolioOutOfRange || hasLLMConsensus) {
                
                // Check if enough time has passed since last notification (5 minutes minimum)
                const now = Date.now();
                const timeSinceLastNotification = now - (window.lastNotificationTimestamps[recommendedAction] || 0);
                const minimumInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
                
                if (timeSinceLastNotification >= minimumInterval) {
                    console.log(`Triggering notification for ${recommendedAction} based on ${
                        isPortfolioOutOfRange ? 'portfolio imbalance' : 'LLM consensus'
                    }`);
                    
                    // Create appropriate message for the notification
                    let notificationMessage = '';
                    if (recommendedAction === 'BUY') {
                        notificationMessage = `Suggested Swap: ~$${swapAmount.toFixed(2)} ${swapDirection}`;
                        console.log(`Notification message for BUY: ${notificationMessage} (swapAmount: ${swapAmount})`);
                    } else if (recommendedAction === 'SELL') {
                        // For SELL, we need to convert the USD amount to ETH
                        const ethAmount = swapAmount / currentPrice;
                        notificationMessage = `Suggested Swap: ~${ethAmount.toFixed(4)} ${swapDirection}`;
                        console.log(`Notification message for SELL: ${notificationMessage} (ethAmount: ${ethAmount}, swapAmount: ${swapAmount})`);
                    }
                    
                    // Trigger the notification
                    if (notificationMessage && window.sendWalletNotification) {
                        window.sendWalletNotification(recommendedAction, notificationMessage);
                        // Update the timestamp
                        window.lastNotificationTimestamps[recommendedAction] = now;
                    }
                } else {
                    console.log(`Skipping ${recommendedAction} notification - too soon since last one (${Math.floor(timeSinceLastNotification/1000)}s ago)`);
                }
            } else {
                console.log(`Not sending notification: portfolio in range=${currentEthAllocation >= targetEthMin && currentEthAllocation <= targetEthMax}, consensus=${hasLLMConsensus}`);
            }
        }
        
        // Recommendation section based on whether we have balances and AI decisions
        const recommendationSection = `
            <div class="col-span-2 mt-3 mb-1 space-y-2">
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Recommended Action:</span>
                    <span class="font-bold ${
                        recommendedAction === 'BUY' ? 'text-green-400' :
                        recommendedAction === 'SELL' ? 'text-red-400' :
                        'text-blue-400'
                    }" data-recommended-action="${recommendedAction}">${recommendedAction}</span>
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
                    <span class="text-gray-300" data-suggested-swap="${recommendedAction === 'BUY' ? `~$${swapAmount.toFixed(2)} ${swapDirection}` : `~${(swapAmount / currentPrice).toFixed(4)} ${swapDirection}`}">
                        ${recommendedAction === 'BUY' ? `~$${swapAmount.toFixed(2)} ${swapDirection}` : `~${(swapAmount / currentPrice).toFixed(4)} ${swapDirection}`}
                    </span>
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
                ${swapAmount > 0 ? `
                <div class="mt-3 border-t border-gray-700 pt-3">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-400">Enable MetaMask Test Notifications:</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="enable-swap-recommendations" class="sr-only peer" ${window.enableSwapRecommendations ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">
                        ${window.enableSwapRecommendations ? 
                            'You will receive test notifications in MetaMask but will not send any transactions' : 
                            'Enable to receive test notifications in MetaMask'}
                    </p>
                    <div class="mt-2 text-center">
                        <button id="test-notification-btn" class="text-xs bg-blue-800 hover:bg-blue-700 text-gray-200 px-2 py-1 rounded transition-colors">
                            Test Notification Now
                        </button>
                    </div>
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
        
        // Reset wallet balances to zero first to ensure we don't display stale data
        // This is crucial when switching between accounts
        window.walletBalances = {
            eth: 0,
            usdc: 0,
            ethusd: 0,
            totalValueUSD: 0
        };
        
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
        // Store this account as explicitly disconnected
        if (window.userAccount && !window.disconnectedAccounts.includes(window.userAccount.toLowerCase())) {
            console.log(`Adding ${window.userAccount} to disconnected accounts list`);
            window.disconnectedAccounts.push(window.userAccount.toLowerCase());
            // Save updated list to localStorage
            saveDisconnectedAccounts();
        }
        
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
        
        // Update LLM decision cards to show "Connect your wallet first"
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

            // Remove this account from the disconnected list if it was there
            const accountLower = accounts[0].toLowerCase();
            const disconnectIndex = window.disconnectedAccounts.indexOf(accountLower);
            if (disconnectIndex > -1) {
                console.log(`Removing ${accounts[0]} from disconnected accounts list`);
                window.disconnectedAccounts.splice(disconnectIndex, 1);
                // Save updated list to localStorage
                saveDisconnectedAccounts();
            }

            // Check which network we're on
            const chainId = await window.web3.eth.getChainId();
            const isLinea = chainId === 59144;
            const isEthereum = chainId === 1;
            
            // Only show warning if on unsupported network, no need for confirmation on supported ones
            if (!isLinea && !isEthereum) {
                window.showNotification(`Connected to unsupported network (ID: ${chainId}). Please switch to Linea (ID: 59144) or Ethereum (ID: 1).`, 'warning');
            }

            // Save account to localStorage
            localStorage.setItem(window.STORAGE_KEYS.WALLET, window.userAccount);

            // Save account immediately to the server
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
                        window.showNotification(`Switched to unsupported network (ID: ${newChainId}). Please switch to Linea (ID: 59144) or Ethereum (ID: 1).`, 'warning');
                    }
                    
                    // Get the current MetaMask account and check if it's disconnected
                    window.ethereum.request({ method: 'eth_accounts' })
                        .then(accounts => {
                            if (accounts && accounts.length > 0) {
                                const currentAccount = accounts[0].toLowerCase();
                                // If the current account is in the disconnected list, maintain disconnected state
                                if (window.disconnectedAccounts.includes(currentAccount)) {
                                    console.log(`Chain changed while using disconnected account ${accounts[0]}`);
                                    window.userAccount = null;
                                    updateWalletUI();
                                    window.displayEmptyStats();
                                    return;
                                }
                            }
                            
                            // If not a disconnected account, proceed with normal updates
                            if (window.userAccount) {
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
                            }
                        })
                        .catch(error => {
                            console.error('Error checking accounts after chain change:', error);
                        });
                    
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
                        // Add to disconnected accounts list
                        if (!window.disconnectedAccounts.includes(window.userAccount.toLowerCase())) {
                            console.log(`Adding ${window.userAccount} to disconnected accounts list on MetaMask disconnect`);
                            window.disconnectedAccounts.push(window.userAccount.toLowerCase());
                            // Save updated list to localStorage
                            saveDisconnectedAccounts();
                        }
                        
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
                // Properly restore the wallet button including disconnect icon
                updateWalletUI();
            }
        }, 2000); // Give time for network switch to stabilize
    } catch (error) {
        console.log(`Network switch error: ${error.message}`);
        window.showNotification('error', `Network switch failed: ${error.message}`);
        // Properly restore the wallet button including disconnect icon
        updateWalletUI();
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
                window.showNotification(`Switched to unsupported network (ID: ${newChainId}). Please switch to Linea (ID: 59144) or Ethereum (ID: 1).`, 'warning');
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
                // Add to disconnected accounts list
                if (!window.disconnectedAccounts.includes(window.userAccount.toLowerCase())) {
                    console.log(`Adding ${window.userAccount} to disconnected accounts list on MetaMask disconnect`);
                    window.disconnectedAccounts.push(window.userAccount.toLowerCase());
                    // Save updated list to localStorage
                    saveDisconnectedAccounts();
                }
                
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
    
    // Additional event listener for the enable swap recommendations toggle
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'enable-swap-recommendations') {
            window.enableSwapRecommendations = event.target.checked;
            // Store preference in localStorage
            localStorage.setItem('stbchef_enable_swap_recommendations', window.enableSwapRecommendations);
            // Update the UI to reflect the change
            updateWalletCard();
            
            // Show notification about the change
            if (window.enableSwapRecommendations) {
                showNotification('MetaMask Test Notifications enabled. You will receive test notifications in MetaMask but will not send any transactions.', 'info');
            } else {
                showNotification('MetaMask Test Notifications disabled. You will only receive notifications in the browser.', 'info');
            }
        }
    });

    // Add this code to the setupMetaMaskEventListeners function, after the enable swap recommendations event listener

    // Event listener for testing notifications
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'test-notification-btn') {
            // Find current recommended action and swap details from the UI
            const actionElement = document.querySelector('[data-recommended-action]');
            const swapElement = document.querySelector('[data-suggested-swap]');
            
            if (actionElement && swapElement) {
                const action = actionElement.getAttribute('data-recommended-action');
                const swapMessage = swapElement.getAttribute('data-suggested-swap');
                
                if (action && swapMessage && window.sendWalletNotification) {
                    window.sendWalletNotification(action, swapMessage);
                    // Removed duplicate notification since sendWalletNotification already shows one
                }
            } else {
                // Fallback if we can't find the elements with data attributes
                const recommendedAction = document.querySelector('.recommended-action');
                const suggestedSwap = document.querySelector('.suggested-swap');
                
                if (recommendedAction && suggestedSwap) {
                    const action = recommendedAction.textContent.trim();
                    const swapMessage = suggestedSwap.textContent.trim();
                    
                    if ((action === 'BUY' || action === 'SELL') && swapMessage && window.sendWalletNotification) {
                        window.sendWalletNotification(action, `Suggested Swap: ${swapMessage}`);
                        // Removed duplicate notification
                    }
                } else {
                    // Last resort: just try to parse directly from the wallet card
                    const actionText = document.querySelector('span.text-green-400, span.text-red-400');
                    const swapText = document.querySelector('span.text-gray-300:not(.text-xs)');
                    
                    if (actionText && swapText && window.sendWalletNotification) {
                        const action = actionText.textContent.trim();
                        const swapMessage = swapText.textContent.trim();
                        
                        if ((action === 'BUY' || action === 'SELL') && swapMessage) {
                            window.sendWalletNotification(action, swapMessage);
                            // Removed duplicate notification
                        } else {
                            showNotification('No valid recommendation found to test', 'warning');
                        }
                    } else {
                        showNotification('No recommendation available to test', 'warning');
                    }
                }
            }
        }
    });
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
            
            // Add the disconnected account to our list
            if (window.userAccount && !window.disconnectedAccounts.includes(window.userAccount.toLowerCase())) {
                console.log(`Adding ${window.userAccount} to disconnected accounts list`);
                window.disconnectedAccounts.push(window.userAccount.toLowerCase());
                // Save updated list to localStorage
                saveDisconnectedAccounts();
            }
            
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
    
    // Check if account actually changed - use case-insensitive comparison
    // Ethereum addresses can have different case but should be treated as identical
    const newAccount = accounts[0].toLowerCase();
    
    // Special case: Check if we're switching FROM a disconnected account TO a non-disconnected account
    const isCurrentAccountDisconnected = !window.userAccount || window.userAccount === null;
    const isNewAccountConnectable = !window.disconnectedAccounts.includes(newAccount);
    
    // If we're currently showing disconnected state but the new account isn't disconnected,
    // we should automatically connect to it
    if (isCurrentAccountDisconnected && isNewAccountConnectable) {
        console.log(`Switching from disconnected state to connectable account ${accounts[0]}`);
        
        // Update the last known account
        window.lastKnownAccount = window.userAccount;
        
        // Initialize web3 first
        if (typeof window.ethereum !== 'undefined') {
            window.web3 = new Web3(window.ethereum);
        }
        
        // Set the account
        window.userAccount = accounts[0];
        
        // Update UI with loading state
        showLoadingWalletState(`Connecting to account ${formatWalletAddress(accounts[0])}...`);
        updateWalletUI();
        
        // Save to localStorage
        localStorage.setItem(window.STORAGE_KEYS.WALLET, window.userAccount);
        
        // Save to server
        persistWalletConnection(window.userAccount);
        
        // Load wallet data in proper sequence
        getWalletBalances()
            .then(() => {
                console.log('Successfully loaded wallet balances');
                return window.fetchWalletStats();
            })
            .then(() => {
                console.log('Successfully loaded wallet stats');
                return fetch('/api/trading-data');
            })
            .then(res => res.json())
            .then(data => {
                window.updateModelDecisions(data, window.userAccount);
                // Show notification
                window.showNotification(`Connected to account ${formatWalletAddress(accounts[0])}`, 'success');
            })
            .catch(error => {
                console.error('Error during wallet initialization:', error);
                // Try to update the wallet card anyway
                updateWalletCard();
                // Still show success notification
                window.showNotification(`Connected to account ${formatWalletAddress(accounts[0])}`, 'success');
            });
        
        return;
    }
    
    // Check if the new account is in the disconnected list - regardless of current connection state
    if (window.disconnectedAccounts.includes(newAccount)) {
        console.log(`Account ${accounts[0]} was previously disconnected, maintaining disconnected state`);
        console.log(`Disconnected accounts: ${JSON.stringify(window.disconnectedAccounts)}`);
        
        // If MetaMask has switched to a disconnected account, we need to update our UI to show it's disconnected
        // This is a switch, not a reconnect attempt, so we should show appropriate feedback
        if (window.userAccount) {
            console.log(`Switching from connected account ${window.userAccount} to disconnected account ${newAccount}`);
            window.showNotification(`Account ${formatWalletAddress(accounts[0])} is disconnected. Click 'Connect Wallet' to reconnect.`, 'warning');
        }
        
        // We need to explicitly set userAccount to null to maintain disconnected state
        window.userAccount = null;
        
        // Explicitly reset wallet balances to clear any data from the previous account
        resetWalletBalances();
        
        // Also update the persistent connection state
        persistWalletConnection(null);
        
        // Update UI for wallet button
        updateWalletUI();
        
        // Explicitly update the wallet card to clear previous account data
        updateWalletCard();
        
        // Update model stats and LLM decisions to show disconnected state
        window.displayEmptyStats();
        fetch('/api/trading-data')
            .then(res => res.json())
            .then(data => window.updateModelDecisions(data, null))
            .catch(error => console.error('Error updating model decisions:', error));
        
        return;
    }
    
    if (newAccount === (window.userAccount ? window.userAccount.toLowerCase() : null)) {
        console.log('Account unchanged, no action needed');
        return;
    }
    
    console.log(`Account changed from ${window.userAccount || 'none'} to ${newAccount}`);
    
    // Update the last known account
    window.lastKnownAccount = window.userAccount;
    window.userAccount = accounts[0];
    
    // Clear old raw accuracy data since we're connecting to a new wallet
    localStorage.removeItem('stbchef_raw_accuracy');
    
    // Reset raw accuracy tracking for new wallet
    window.aiRawAccuracy = {
        gemini: { correct: 0, total: 0, accuracy: 0 },
        groq: { correct: 0, total: 0, accuracy: 0 },
        mistral: { correct: 0, total: 0, accuracy: 0 }
    };
    
    // Reset wallet UI and balances to clear data from previous account
    resetWalletBalances();
    
    // Display loading state in wallet card
    showLoadingWalletState(`Loading data for account ${formatWalletAddress(accounts[0])}...`);
    
    // Save to localStorage
    localStorage.setItem(window.STORAGE_KEYS.WALLET, window.userAccount);
    
    // Save to server
    persistWalletConnection(window.userAccount);
    
    // Update UI
    updateWalletUI();
    
    // Update wallet data with small delay to ensure previous data is cleared
    setTimeout(() => {
        getWalletBalances()
            .then(() => {
                console.log('Successfully fetched balances for new account');
            })
            .catch(error => {
                console.error('Error fetching wallet balances after account change:', error);
            });
            
        // Update model stats and LLM decisions on account change
        window.fetchWalletStats()
            .catch(error => console.error('Error fetching wallet stats after account change:', error));
        
        fetch('/api/trading-data')
            .then(res => res.json())
            .then(data => window.updateModelDecisions(data, window.userAccount))
            .catch(error => console.error('Error updating model decisions:', error));
    }, 100);
    
    // Request permission for new account
    window.requestNotificationPermission()
        .catch(error => console.error('Error requesting notification permission:', error));
    
    // Show notification
    window.showNotification('Wallet account changed', 'info');
}

// Add document ready handler to set up MetaMask event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load the disconnected accounts list from localStorage
    const savedDisconnectedAccounts = localStorage.getItem('stbchef_disconnected_accounts');
    if (savedDisconnectedAccounts) {
        try {
            window.disconnectedAccounts = JSON.parse(savedDisconnectedAccounts);
            console.log(`Loaded ${window.disconnectedAccounts.length} disconnected accounts from localStorage`);
        } catch (e) {
            console.error('Error parsing disconnected accounts:', e);
            window.disconnectedAccounts = [];
        }
    }
    
    // If MetaMask is available, check for auto-connected accounts that may have been disconnected
    if (typeof window.ethereum !== 'undefined') {
        console.log('Checking for auto-connected accounts that should be disconnected');
        window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts && accounts.length > 0) {
                    const account = accounts[0].toLowerCase();
                    if (window.disconnectedAccounts.includes(account)) {
                        console.log(`Auto-connected account ${accounts[0]} was previously disconnected, maintaining disconnected state`);
                        // Clear the connection in our app
                        window.userAccount = null;
                        // Update the persistent connection state without trying to fetch from the server first
                        // This is a safer approach when the GET endpoint might not be implemented yet
                        try {
                            fetch('/api/wallet/connection', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    wallet_address: account,
                                    is_connected: false
                                })
                            }).catch(error => {
                                console.warn('Error updating wallet disconnection on page load, continuing anyway:', error);
                            });
                        } catch (e) {
                            console.warn('Error sending disconnection to server, continuing anyway:', e);
                        }
                        
                        // Update UI if needed
                        if (typeof updateWalletUI === 'function') {
                            updateWalletUI();
                        }
                        
                        // Show notification to user after a short delay to ensure UI is loaded
                        setTimeout(() => {
                            window.showNotification(`Account ${formatWalletAddress(accounts[0])} is disconnected. Click 'Connect Wallet' to reconnect.`, 'info');
                        }, 1000);
                    } else {
                        // If the account is not disconnected, we should connect to it
                        if (!window.userAccount) {
                            console.log(`Auto-connecting to account ${accounts[0]}`);
                            // Initialize web3 first
                            window.web3 = new Web3(window.ethereum);
                            // Set account
                            window.userAccount = accounts[0];
                            // Save to localStorage
                            localStorage.setItem(window.STORAGE_KEYS.WALLET, accounts[0]);
                            // Update connection status
                            persistWalletConnection(accounts[0]);
                            // Update UI
                            updateWalletUI();
                            // Load wallet data
                            Promise.all([
                                getWalletBalances(),
                                window.fetchWalletStats()
                            ])
                            .then(() => {
                                console.log(`Successfully initialized wallet ${accounts[0]}`);
                                // Update trading data after wallet is fully loaded
                                return fetch('/api/trading-data');
                            })
                            .then(res => res.json())
                            .then(data => {
                                window.updateModelDecisions(data, window.userAccount);
                            })
                            .catch(error => {
                                console.error('Error during wallet initialization:', error);
                            });
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error checking auto-connected accounts:', error);
            });
            
        // Set up an interval to check for account changes in MetaMask that might not trigger events
        window.accountCheckInterval = setInterval(async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    
                    if (accounts && accounts.length > 0) {
                        const currentMetaMaskAccount = accounts[0].toLowerCase();
                        const currentAppAccount = window.userAccount ? window.userAccount.toLowerCase() : null;
                        
                        // If the accounts don't match and the MetaMask account is not disconnected
                        if (currentMetaMaskAccount !== currentAppAccount && 
                            !window.disconnectedAccounts.includes(currentMetaMaskAccount)) {
                            
                            console.log(`Detected account change from MetaMask: ${currentAppAccount} -> ${currentMetaMaskAccount}`);
                            
                            // Handle the account change
                            handleAccountsChanged(accounts);
                        }
                        
                        // If we're showing disconnected but the current account is not in the disconnected list,
                        // we should auto-connect
                        if (!window.userAccount && !window.disconnectedAccounts.includes(currentMetaMaskAccount)) {
                            console.log(`Auto-connecting to available account ${accounts[0]}`);
                            
                            // First disable any existing auto-connection attempts that might be in progress
                            if (window.autoConnectTimeout) {
                                clearTimeout(window.autoConnectTimeout);
                            }
                            
                            // Initialize web3 first
                            window.web3 = new Web3(window.ethereum);
                            
                            // Set account
                            window.userAccount = accounts[0];
                            
                            // Update UI with loading state
                            showLoadingWalletState(`Connecting to account ${formatWalletAddress(accounts[0])}...`);
                            updateWalletUI();
                            
                            // Save to localStorage
                            localStorage.setItem(window.STORAGE_KEYS.WALLET, accounts[0]);
                            
                            // Update connection status
                            persistWalletConnection(accounts[0]);
                            
                            // Load wallet data in a proper sequence
                            getWalletBalances()
                                .then(() => {
                                    console.log('Successfully loaded wallet balances');
                                    return window.fetchWalletStats();
                                })
                                .then(() => {
                                    console.log('Successfully loaded wallet stats');
                                    return fetch('/api/trading-data');
                                })
                                .then(res => res.json())
                                .then(data => {
                                    window.updateModelDecisions(data, window.userAccount);
                                })
                                .catch(error => {
                                    console.error('Error during wallet initialization:', error);
                                    // Try to update the wallet card anyway
                                    updateWalletCard();
                                });
                        }
                    }
                } catch (error) {
                    console.warn('Error during periodic account check:', error);
                }
            }
        }, 1000); // Check every second
    }
    
    // Attempt to set up MetaMask event listeners if ethereum is available
    if (typeof window.ethereum !== 'undefined') {
        console.log('Setting up MetaMask event listeners on page load');
        setupMetaMaskEventListeners();
    } else {
        console.log('MetaMask not detected on page load');
    }
    
    // Clear interval when page is hidden/closed
    window.addEventListener('beforeunload', () => {
        if (window.accountCheckInterval) {
            clearInterval(window.accountCheckInterval);
        }
    });
    
    // Clear interval when page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && window.accountCheckInterval) {
            clearInterval(window.accountCheckInterval);
        } else if (document.visibilityState === 'visible' && !window.accountCheckInterval) {
            // Restart the interval if it was cleared
            window.accountCheckInterval = setInterval(async () => {
                // Same code as above for consistency
                if (typeof window.ethereum !== 'undefined') {
                    try {
                        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                        
                        if (accounts && accounts.length > 0) {
                            const currentMetaMaskAccount = accounts[0].toLowerCase();
                            const currentAppAccount = window.userAccount ? window.userAccount.toLowerCase() : null;
                            
                            // If the accounts don't match and the MetaMask account is not disconnected
                            if (currentMetaMaskAccount !== currentAppAccount && 
                                !window.disconnectedAccounts.includes(currentMetaMaskAccount)) {
                                
                                console.log(`Detected account change from MetaMask: ${currentAppAccount} -> ${currentMetaMaskAccount}`);
                                
                                // Handle the account change
                                handleAccountsChanged(accounts);
                            }
                            
                            // If we're showing disconnected but the current account is not in the disconnected list,
                            // we should auto-connect
                            if (!window.userAccount && !window.disconnectedAccounts.includes(currentMetaMaskAccount)) {
                                console.log(`Auto-connecting to available account ${accounts[0]}`);
                                
                                // First disable any existing auto-connection attempts that might be in progress
                                if (window.autoConnectTimeout) {
                                    clearTimeout(window.autoConnectTimeout);
                                }
                                
                                // Initialize web3 first
                                window.web3 = new Web3(window.ethereum);
                                
                                // Set account
                                window.userAccount = accounts[0];
                                
                                // Update UI with loading state
                                showLoadingWalletState(`Connecting to account ${formatWalletAddress(accounts[0])}...`);
                                updateWalletUI();
                                
                                // Save to localStorage
                                localStorage.setItem(window.STORAGE_KEYS.WALLET, accounts[0]);
                                
                                // Update connection status
                                persistWalletConnection(accounts[0]);
                                
                                // Load wallet data in a proper sequence
                                getWalletBalances()
                                    .then(() => {
                                        console.log('Successfully loaded wallet balances');
                                        return window.fetchWalletStats();
                                    })
                                    .then(() => {
                                        console.log('Successfully loaded wallet stats');
                                        return fetch('/api/trading-data');
                                    })
                                    .then(res => res.json())
                                    .then(data => {
                                        window.updateModelDecisions(data, window.userAccount);
                                    })
                                    .catch(error => {
                                        console.error('Error during wallet initialization:', error);
                                        // Try to update the wallet card anyway
                                        updateWalletCard();
                                    });
                            }
                        }
                    } catch (error) {
                        console.warn('Error during periodic account check:', error);
                    }
                }
            }, 1000);
        }
    });
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
window.saveDisconnectedAccounts = saveDisconnectedAccounts;

// At the beginning of the file, after the initial variables, add:

// Timestamp tracking for notifications to prevent spam
window.lastNotificationTimestamps = {
    BUY: 0,
    SELL: 0,
    HOLD: 0
};