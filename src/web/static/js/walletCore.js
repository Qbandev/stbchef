/*
 * Core wallet functionality for Simple Crypto Trading Bot Chef
 * ------------------------------------------------------------
 * This file groups the non-UI wallet operations – connection handling,
 * network switching, balance retrieval, MetaMask listeners, etc.
 *
 * NOTE:  At the moment these functions simply forward to their existing
 * implementations in `walletManager.js`.  Splitting the giant file into
 * smaller, more cohesive modules will be done incrementally – for now we
 * provide an easy import surface (`window.walletCore`) that other code can
 * start consuming immediately, without breaking anything.
 */

(function () {
  // Ensure we only initialise once even if script loaded twice.
  if (window.walletCore) return;

  // Init global walletBalances if not present
  if (!window.walletBalances) {
    window.walletBalances = { eth: 0, usdc: 0, ethusd: 0, totalValueUSD: 0 };
  }

  // ---------------- Migrated implementations ----------------
  // Guarantee required globals exist
  if (!window.disconnectedAccounts) window.disconnectedAccounts = [];

  function saveDisconnectedAccounts() {
    try {
      localStorage.setItem('stbchef_disconnected_accounts', JSON.stringify(window.disconnectedAccounts));
      console.log(`Saved ${window.disconnectedAccounts.length} disconnected accounts to localStorage`);
    } catch (error) {
      console.error('Error saving disconnected accounts:', error);
    }
  }

  function formatWalletAddress(address) {
    if (!address) return '';
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      console.warn(`Invalid Ethereum address format: ${address}`);
      return address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function persistWalletConnection(account) {
    if (account) {
      fetch('/api/wallet/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: account, is_connected: true })
      }).catch(err => console.warn('Error persisting wallet connection (continuing anyway):', err));
    } else if (window.userAccount) {
      fetch('/api/wallet/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: window.userAccount, is_connected: false })
      }).catch(err => console.warn('Error persisting wallet disconnection (continuing anyway):', err));
    }
  }

  // Expose migrated implementations globally (override legacy ones)
  window.saveDisconnectedAccounts = saveDisconnectedAccounts;
  window.formatWalletAddress = formatWalletAddress;
  window.persistWalletConnection = persistWalletConnection;

  // Defensive: warn if the legacy functions have not been defined yet.
  const warnMissing = (fn) => {
    if (typeof window[fn] !== 'function') {
      console.warn(`[walletCore] Expected global function "${fn}" is not available yet.`);
      return () => {
        throw new Error(`walletCore: underlying function ${fn} is not defined`);
      };
    }
    return window[fn];
  };

  // Core / plumbing helpers (no DOM manipulation here)
  window.walletCore = {
    /* connection & network */
    connectWallet: warnMissing('connectWallet'),
    switchNetwork: warnMissing('switchNetwork'),
    persistWalletConnection: warnMissing('persistWalletConnection'),

    /* balances */
    getWalletBalances: warnMissing('getWalletBalances'),
    getTokenBalance: warnMissing('getTokenBalance'),
    resetWalletBalances: warnMissing('resetWalletBalances'),

    /* MetaMask listeners & helpers */
    setupMetaMaskEventListeners: warnMissing('setupMetaMaskEventListeners'),
    handleAccountsChanged: warnMissing('handleAccountsChanged'),

    /* misc utilities */
    saveDisconnectedAccounts: warnMissing('saveDisconnectedAccounts'),
    formatWalletAddress: warnMissing('formatWalletAddress'),
  };

  // ---------------- Migrated balance helpers ----------------
  function resetWalletBalances() {
    window.walletBalances = { eth: 0, usdc: 0, ethusd: 0, totalValueUSD: 0 };
    if (typeof window.updateWalletCard === 'function') window.updateWalletCard();
    if (typeof window.updateModelStatsForWallet === 'function') window.updateModelStatsForWallet();
  }

  // getTokenBalance copied from legacy (kept identical except minor refactor)
  async function getTokenBalance(tokenAddress) {
    try {
      console.log(`[walletCore] fetch token balance for ${tokenAddress}`);
      const ERC20_ABI = [
        { constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], type: 'function' },
        { constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], type: 'function' },
        { constant: true, inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], type: 'function' }
      ];
      let tokenContract;
      try {
        tokenContract = new window.web3.eth.Contract(ERC20_ABI, tokenAddress);
        if (!tokenContract.methods || typeof tokenContract.methods.symbol !== 'function') throw new Error('methods missing');
      } catch (err) {
        console.warn('[walletCore] fallback contract for token');
        tokenContract = { methods: { symbol: () => ({ call: async () => 'UNKNOWN' }), decimals: () => ({ call: async () => '6' }), balanceOf: () => ({ call: async () => '0' }) } };
      }
      const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms));
      await Promise.race([tokenContract.methods.symbol().call(), timeout(2000)]).catch(() => {});
      // get decimals
      let decimals = 6;
      try { decimals = await Promise.race([tokenContract.methods.decimals().call(), timeout(3000)]); } catch {}
      let balanceRaw = '0';
      try { balanceRaw = await Promise.race([tokenContract.methods.balanceOf(window.userAccount).call(), timeout(3000)]); } catch {}
      const dec = parseInt(decimals) || 6;
      const bal = parseFloat(balanceRaw) || 0;
      window.walletBalances.usdc = bal / Math.pow(10, dec);
      return window.walletBalances.usdc;
    } catch (err) {
      console.warn('[walletCore] token balance error', err.message);
      window.walletBalances.usdc = 0;
      return 0;
    }
  }

  async function getWalletBalances() {
    if (!window.userAccount || !window.web3) {
      console.log('[walletCore] no wallet connection');
      resetWalletBalances();
      return;
    }
    try {
      console.log('[walletCore] fetching balances');
      const currentEthPrice = window.walletBalances.ethusd || 0;
      window.walletBalances = { eth: 0, usdc: 0, ethusd: currentEthPrice, totalValueUSD: 0 };
      if (typeof window.showLoadingWalletState === 'function') window.showLoadingWalletState('Retrieving wallet balances...');

      const chainId = await window.web3.eth.getChainId();
      const isLinea = chainId === 59144;
      const isEthereum = chainId === 1;
      const isHardhat = chainId === 31337;

      // ETH balance
      const ethBalWei = await window.web3.eth.getBalance(window.userAccount);
      window.walletBalances.eth = parseFloat(window.web3.utils.fromWei(ethBalWei, 'ether'));

      // USDC balance only on supported nets
      if (isLinea) {
        await getTokenBalance('0x176211869cA2b568f2A7D4EE941E073a821EE1ff');
      } else if (isEthereum) {
        await getTokenBalance('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
      }

      // Simple ETH price fetch (reuse existing logic if present)
      if (!window.walletBalances.ethusd || window.walletBalances.ethusd === 0) {
        try {
          const api = await fetch('/api/trading-data').then(r => r.json());
          if (api && api.eth_price) window.walletBalances.ethusd = parseFloat(api.eth_price);
        } catch {}
      }

      if (window.walletBalances.ethusd) {
        window.walletBalances.totalValueUSD = (window.walletBalances.eth * window.walletBalances.ethusd) + window.walletBalances.usdc;
      }

      if (typeof window.updateWalletCard === 'function') window.updateWalletCard();
      if (typeof window.updateModelStatsForWallet === 'function') window.updateModelStatsForWallet();
    } catch (err) {
      console.error('[walletCore] error fetching balances', err);
      if (typeof window.showNotification === 'function') window.showNotification('Error fetching wallet balances: ' + err.message, 'error');
    }
  }

  // expose
  window.resetWalletBalances = resetWalletBalances;
  window.getTokenBalance = getTokenBalance;
  window.getWalletBalances = getWalletBalances;

  console.log('[walletCore] module initialised');

  // ---------------- Connection helpers migration ----------------
  /**
   * Connect to MetaMask or disconnect if already connected.
   * (Copied verbatim from legacy walletManager.js with minor formatting.)
   */
  async function connectWallet() {
    // If already connected, disconnect
    if (window.userAccount) {
      if (window.userAccount && !window.disconnectedAccounts.includes(window.userAccount.toLowerCase())) {
        console.log(`Adding ${window.userAccount} to disconnected accounts list`);
        window.disconnectedAccounts.push(window.userAccount.toLowerCase());
        saveDisconnectedAccounts();
      }
      window.userAccount = null;
      window.web3 = null;
      window.ethersProvider = null;
      window.smartAccountAddress = null;
      resetWalletBalances();
      localStorage.removeItem(window.STORAGE_KEYS.WALLET);
      localStorage.removeItem('stbchef_raw_accuracy');
      window.aiRawAccuracy = { gemini: { correct: 0, total: 0, accuracy: 0 }, groq: { correct: 0, total: 0, accuracy: 0 }, mistral: { correct: 0, total: 0, accuracy: 0 } };
      updateWalletUI();
      if (typeof window.displayEmptyStats === 'function') window.displayEmptyStats();
      try {
        const tradingData = await fetch('/api/trading-data').then(r => r.json());
        if (typeof window.updateModelDecisions === 'function') window.updateModelDecisions(tradingData, null);
      } catch {}
      window.showNotification && window.showNotification('Wallet disconnected', 'warning');
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      window.showNotification && window.showNotification('Please install MetaMask!', 'error');
      return;
    }

    try {
      const walletBtn = document.getElementById('wallet-btn');
      if (walletBtn) {
        walletBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin mr-2"></i> Connecting...';
        walletBtn.classList.add('connecting');
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts', params: [] });
      if (!accounts || accounts.length === 0) throw new Error('No accounts returned');

      window.userAccount = accounts[0];
      window.web3 = new Web3(window.ethereum);

      if (typeof ethers !== 'undefined') {
        window.ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        if (typeof window.initSwapManager === 'function') {
          try { await window.initSwapManager(window.web3); } catch {}
        }
        if (typeof window.createSmartAccount === 'function') {
          try {
            const signer = window.ethersProvider.getSigner();
            window.smartAccountAddress = await window.createSmartAccount(signer);
          } catch {}
        }
      }

      // Remove from disconnected list
      const idx = window.disconnectedAccounts.indexOf(window.userAccount.toLowerCase());
      if (idx > -1) { window.disconnectedAccounts.splice(idx, 1); saveDisconnectedAccounts(); }

      localStorage.setItem(window.STORAGE_KEYS.WALLET, window.userAccount);
      persistWalletConnection(window.userAccount);

      updateWalletUI();
      await getWalletBalances();
      if (typeof window.fetchWalletStats === 'function') try { await window.fetchWalletStats(); } catch {}
      try {
        const data = await fetch('/api/trading-data').then(r => r.json());
        if (typeof window.updateModelDecisions === 'function') window.updateModelDecisions(data, window.userAccount);
      } catch {}

      window.showNotification && window.showNotification('Wallet connected successfully!', 'success');
      setupMetaMaskEventListeners();
    } catch (err) {
      console.error('Error connecting wallet:', err);
      window.showNotification && window.showNotification('Failed to connect wallet', 'error');
    } finally {
      const walletBtn = document.getElementById('wallet-btn');
      if (walletBtn) walletBtn.classList.remove('connecting');
    }
  }

  /** Switch network helper (migrated) */
  async function switchNetwork(chainId) {
    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) walletBtn.textContent = 'Switching Network...';
    window.showLoadingWalletState && window.showLoadingWalletState(`Switching to ${chainId === 1 ? 'Ethereum' : chainId === 59144 ? 'Linea' : chainId}`);
    try {
      if (!window.ethereum) throw new Error('MetaMask not detected');
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + chainId.toString(16) }] });
      } catch (switchError) {
        if (switchError.code === 4902 && chainId === 59144) {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0xe708', chainName: 'Linea Mainnet', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.linea.build'], blockExplorerUrls: ['https://lineascan.build'] }] });
        } else throw switchError;
      }
      window.web3 = new Web3(window.ethereum);
      setTimeout(async () => {
        try { await getWalletBalances(); } catch {}
        updateConnectedNetwork(chainId);
        updateWalletUI();
      }, 2000);
    } catch (err) {
      console.error('Network switch error', err);
      window.showNotification && window.showNotification('error', `Network switch failed: ${err.message}`);
      updateWalletUI();
    }
  }

  /** Handle MetaMask account changes (migrated) */
  function handleAccountsChanged(accounts) {
    if (!accounts || accounts.length === 0) { resetWalletBalances(); window.userAccount = null; updateWalletUI(); return; }
    const newAcc = accounts[0].toLowerCase();
    if (window.disconnectedAccounts.includes(newAcc)) { window.userAccount = null; updateWalletUI(); return; }
    if (window.userAccount && newAcc === window.userAccount.toLowerCase()) return;
    window.userAccount = accounts[0];
    localStorage.setItem(window.STORAGE_KEYS.WALLET, window.userAccount);
    persistWalletConnection(window.userAccount);
    getWalletBalances();
    updateWalletUI();
  }

  /** Set up MetaMask event listeners once */
  function setupMetaMaskEventListeners() {
    if (!window.ethereum || window.hasSetupMetaMaskEvents) return;
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', (hex) => {
      const id = parseInt(hex, 16);
      updateConnectedNetwork(id);
      getWalletBalances();
      updateWalletUI();
    });
    window.ethereum.on('disconnect', () => { window.userAccount = null; resetWalletBalances(); updateWalletUI(); });
    window.hasSetupMetaMaskEvents = true;
  }

  // Export
  window.connectWallet = connectWallet;
  window.switchNetwork = switchNetwork;
  window.handleAccountsChanged = handleAccountsChanged;
  window.setupMetaMaskEventListeners = setupMetaMaskEventListeners;

  // Update walletCore mapping to use real implementations
  window.walletCore.connectWallet = connectWallet;
  window.walletCore.switchNetwork = switchNetwork;
  window.walletCore.setupMetaMaskEventListeners = setupMetaMaskEventListeners;
  window.walletCore.handleAccountsChanged = handleAccountsChanged;

  // After implementing balance helpers
  // Refresh walletCore mapping for balance functions
  if (window.walletCore) {
    window.walletCore.getWalletBalances = getWalletBalances;
    window.walletCore.getTokenBalance = getTokenBalance;
    window.walletCore.resetWalletBalances = resetWalletBalances;
  }
})(); 