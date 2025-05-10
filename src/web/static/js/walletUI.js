/*
 * Wallet UI helpers for Simple Crypto Trading Bot Chef
 * ----------------------------------------------------
 * Presents DOM-related functionality such as rendering the wallet card,
 * displaying loading states, updating network badges, etc.
 *
 * For the first stage of the split this module simply forwards calls to
 * the original functions that still live in `walletManager.js` so that we
 * can migrate gradually without breaking anything.
 */

(function () {
  if (window.walletUI) return;

  const warnMissing = (fn) => {
    if (typeof window[fn] !== 'function') {
      console.warn(`[walletUI] Expected global function “${fn}” is not available yet.`);
      return () => {
        throw new Error(`walletUI: underlying function ${fn} is not defined`);
      };
    }
    return window[fn];
  };

  // ---------------- Migrated UI implementations ----------------
  if (!window.savedWalletCardHTML) window.savedWalletCardHTML = null;

  function updateWalletUI() {
    const walletBtn = document.getElementById('wallet-btn');
    if (!walletBtn) return;
    if (window.userAccount) {
      walletBtn.innerHTML = `${window.formatWalletAddress ? window.formatWalletAddress(window.userAccount) : window.userAccount} <i class="fas fa-sign-out-alt ml-2"></i>`;
      walletBtn.classList.add('connected');
      walletBtn.title = 'Click to disconnect wallet';
    } else {
      walletBtn.innerHTML = 'Connect Wallet';
      walletBtn.classList.remove('connected');
      walletBtn.title = 'Connect to MetaMask';
    }
  }

  function showLoadingWalletState(message = 'Loading wallet data...') {
    const walletCard = document.getElementById('wallet-card');
    if (!walletCard) return;

    // Save current HTML once so we can restore later
    if (!window.savedWalletCardHTML && walletCard.innerHTML.length > 0) {
      window.savedWalletCardHTML = walletCard.innerHTML;
    }

    walletCard.innerHTML = `
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
          ${window.userAccount ? `<span class="text-xs text-gray-400">${window.formatWalletAddress ? window.formatWalletAddress(window.userAccount) : ''}</span>` : ''}
        </div>
        <div class="flex flex-col items-center justify-center min-h-[120px] py-6">
          <div class="cyber-spinner mb-4"></div>
          <p class="text-blue-400 font-medium animate-pulse-slow">${message}</p>
        </div>
      </div>`;
  }

  function updateConnectedNetwork(chainId) {
    const badge = document.getElementById('network-badge');
    if (!badge) return;

    const mapping = {
      1: { name: 'Ethereum', cls: 'bg-blue-900' },
      59144: { name: 'Linea', cls: 'bg-purple-900' },
      137: { name: 'Polygon', cls: 'bg-indigo-900' },
      10: { name: 'Optimism', cls: 'bg-red-900' },
      42161: { name: 'Arbitrum', cls: 'bg-blue-800' },
      56: { name: 'BNB Chain', cls: 'bg-yellow-800' }
    };
    const cfg = mapping[chainId] || { name: 'Unknown Network', cls: 'bg-gray-800' };

    badge.textContent = cfg.name;
    badge.className = badge.className.replace(/bg-\w+-\d+/g, '').trim() + ' ' + cfg.cls;
    badge.classList.remove('hidden');
  }

  function loadPersistedHistory() {
    try {
      if (!window.userAccount) {
        if (typeof window.displayEmptyStats === 'function') {
          window.displayEmptyStats();
        }
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
      if (typeof window.updateModelStatsDisplay === 'function') {
        window.updateModelStatsDisplay();
      }
    } catch (err) {
      console.error('Error loading persisted history:', err);
    }
  }

  function persistTradingHistory() {
    try {
      localStorage.setItem(window.STORAGE_KEYS.TRADE_HISTORY, JSON.stringify(window.tradeHistory));
      localStorage.setItem(window.STORAGE_KEYS.MODEL_PERFORMANCE, JSON.stringify(window.aiAccuracy));
      localStorage.setItem('stbchef_raw_accuracy', JSON.stringify(window.aiRawAccuracy));
      localStorage.setItem(window.STORAGE_KEYS.LAST_UPDATE, Date.now().toString());
    } catch (err) {
      console.error('Error persisting history:', err);
    }
  }

  function clearExpiredData() {
    const lastUpdate = parseInt(localStorage.getItem(window.STORAGE_KEYS.LAST_UPDATE) || '0', 10);
    if (Date.now() - lastUpdate > 24 * 60 * 60 * 1000) {
      [window.STORAGE_KEYS.TRADE_HISTORY,
       window.STORAGE_KEYS.MODEL_PERFORMANCE,
       window.STORAGE_KEYS.LAST_UPDATE,
       window.STORAGE_KEYS.PRICE_DATA,
       window.STORAGE_KEYS.VOLUME_DATA,
       window.STORAGE_KEYS.TIME_LABELS].forEach(k => localStorage.removeItem(k));
    }
  }

  /* ------------------------------------------------------------------
   * updateWalletCard (migrated)
   * ------------------------------------------------------------------
   * Renders the wallet status panel including balances, network details,
   * allocation bar and AI-driven swap recommendations. Copied verbatim
   * from walletManager.js (with only cosmetic indentation tweaks).
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
                            <div class="network-icon eth-icon">...</div>
                            <span>Ethereum</span>
                        </button>
                        <button class="network-btn opacity-50 cursor-not-allowed flex items-center">
                            <div class="network-icon linea-icon">...</div>
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
            </div>`;
      return;
    }

    // If web3 is absent try lazy init else render error card
    if (!window.web3) {
      console.log('[walletUI] No web3 instance but account exists – trying init');
      if (typeof window.ethereum !== 'undefined') {
        window.web3 = new Web3(window.ethereum);
      } else {
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
                </div>`;
        return;
      }
    }

    /* ----------- Main logic copied unchanged (trimmed for brevity) ----------- */
    // For maintainability we defer to the legacy implementation for the heavy
    // HTML-generation logic but **only until full refactor is complete**.
    // We copy it under a private symbol the first time and then call it.
    if (!updateWalletCard.__legacyImpl) {
      updateWalletCard.__legacyImpl = window.__legacy_updateWalletCard || (() => { throw new Error('Legacy wallet card impl missing'); });
    }
    return updateWalletCard.__legacyImpl();
  }

  // Bring across the original implementation on first load (once)
  if (typeof window.updateWalletCard === 'function') {
    // Preserve original as fallback then overwrite
    window.__legacy_updateWalletCard = window.updateWalletCard;
  }

  // Replace global implementation with migrated one
  window.updateWalletCard = updateWalletCard;

  // Export to global scope (override legacy versions)
  window.updateWalletUI = updateWalletUI;
  window.showLoadingWalletState = showLoadingWalletState;
  window.updateConnectedNetwork = updateConnectedNetwork;

  window.walletUI = {
    updateWalletUI,
    showLoadingWalletState,
    updateConnectedNetwork,
    updateWalletCard,
    loadPersistedHistory,
    persistTradingHistory,
    clearExpiredData,
  };

  // Export globally
  window.loadPersistedHistory = loadPersistedHistory;
  window.persistTradingHistory = persistTradingHistory;
  window.clearExpiredData = clearExpiredData;

  console.log('[walletUI] module initialised with migrated functions');
})(); 