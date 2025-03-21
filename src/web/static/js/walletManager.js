// Wallet management functions for Simple Crypto Trading Bot Chef

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
        walletBtn.innerHTML = `${window.userAccount.substring(0, 6)}...${window.userAccount.substring(38)} <i class="fas fa-sign-out-alt ml-2"></i>`;
        walletBtn.classList.add('connected');
        walletBtn.title = 'Click to disconnect wallet';
    } else {
        walletBtn.innerHTML = 'Connect Wallet';
        walletBtn.classList.remove('connected');
        walletBtn.title = 'Connect to MetaMask';
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

// Make functions available globally
window.persistWalletConnection = persistWalletConnection;
window.updateWalletUI = updateWalletUI;
window.loadPersistedHistory = loadPersistedHistory;
window.persistTradingHistory = persistTradingHistory;
window.clearExpiredData = clearExpiredData; 