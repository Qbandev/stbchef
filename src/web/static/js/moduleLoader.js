// Module Loader for Simple Crypto Trading Bot Chef
console.log('[moduleLoader] Version 2025-05-12-a');
// This file helps load ES modules properly and initialize app functionality

// Function to dynamically import modules
async function loadModules() {
  try {
    console.log('Loading ES6 modules...');
    
    // Check if ethers is already loaded globally
    if (typeof window.ethers === 'undefined') {
      console.warn('Ethers library not found globally. Some features may not work.');
    } else {
      console.log('Using globally loaded ethers library:', window.ethers.version || 'unknown version');
    }
    
    // Import the smart account module
    try {
      const smartAccountModule = await import('./smartAccount.js');
      
      // Attach needed functions to window for global access
      window.createSmartAccount = smartAccountModule.createSmartAccount;
      window.buildPectraTx = smartAccountModule.buildPectraTx;
      window.Feature = smartAccountModule.Feature;
      window.TokenAddresses = smartAccountModule.TokenAddresses;
      window.DEPLOYED_CONTRACTS = smartAccountModule.DEPLOYED_CONTRACTS;
      
      console.log('Smart Account module loaded');
    } catch (error) {
      console.error('Failed to load Smart Account module:', error);
    }
    
    // Import the swap manager module
    try {
      const swapManagerModule = await import('./swapManager.js');
      
      // Attach needed functions to window for global access
      window.initSwapManager = swapManagerModule.initSwapManager;
      window.swapEthToUsdc = swapManagerModule.swapEthToUsdc;
      window.swapUsdcToEth = swapManagerModule.swapUsdcToEth;
      window.executeAIRecommendedSwap = swapManagerModule.executeAIRecommendedSwap;
      window.getRecentSwaps = swapManagerModule.getRecentSwaps;
      window.SwapStatus = swapManagerModule.SwapStatus;
      
      console.log('Swap Manager module loaded');
    } catch (error) {
      console.error('Failed to load Swap Manager module:', error);
    }
    
    // Initialize if wallet is already connected
    if (window.userAccount && window.web3) {
      console.log('Wallet already connected, initializing swap manager...');
      try {
        await initializeEthersProvider();
      } catch (error) {
        console.error('Error initializing with existing wallet:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error loading modules:', error);
    return false;
  }
}

// Function to initialize ethers provider and related functionality
async function initializeEthersProvider() {
  try {
    // Confirm ethers is available
    if (typeof window.ethers !== 'undefined' && window.ethereum) {
      console.log('[moduleLoader initializeEthersProvider] Initializing ethers provider...');
      
      // Get the current network
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);
      console.log(`[moduleLoader initializeEthersProvider] Current chainId from ethereum: ${chainId}`);
      
      // Initialize ethers provider with the current ethereum provider
      window.ethersProvider = new window.ethers.providers.Web3Provider(window.ethereum, 'any');
      console.log('[moduleLoader initializeEthersProvider] window.ethersProvider assigned:', window.ethersProvider);
      
      // Force refresh provider to get latest network
      await window.ethersProvider.ready;
      console.log('[moduleLoader initializeEthersProvider] window.ethersProvider.ready completed.');
      
      // Log network details
      const network = await window.ethersProvider.getNetwork();
      console.log(`[moduleLoader initializeEthersProvider] Ethers provider initialized with network: ${network.name} (chainId: ${network.chainId})`);
      
      // Initialize swap manager
      if (typeof window.initSwapManager === 'function' && window.web3) {
        console.log('[moduleLoader initializeEthersProvider] Calling window.initSwapManager...');
        await window.initSwapManager(window.web3);
        console.log('[moduleLoader initializeEthersProvider] Swap manager initialized (after initSwapManager call).');
      } else {
        console.warn('[moduleLoader initializeEthersProvider] initSwapManager or window.web3 not available.', {
          hasInitSwapManager: typeof window.initSwapManager === 'function',
          hasWeb3: typeof window.web3 !== 'undefined'
        });
      }
      
      // Create smart account if needed
      if (typeof window.createSmartAccount === 'function' && window.ethersProvider) {
        const signer = window.ethersProvider.getSigner();
        const smartAccountAddress = await window.createSmartAccount(signer);
        window.smartAccountAddress = smartAccountAddress;
        
        console.log('Smart account created:', smartAccountAddress);
      }
      
      return true;
    } else {
      console.warn('ethers library or ethereum provider not available, advanced features disabled');
      return false;
    }
  } catch (error) {
    console.error('Error initializing ethers provider:', error);
    return false;
  }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Check if ethers is already loaded
  if (typeof window.ethers === 'undefined') {
    console.log('Ethers not loaded yet, attempting to load it');
    
    // Load the ethers library
    const ethersScript = document.createElement('script');
    ethersScript.src = '/static/js/lib/ethers-5.7.2.umd.min.js'; // Use local file instead of CDN
    ethersScript.type = 'text/javascript';
    
    ethersScript.onload = function() {
      console.log('ethers library loaded locally');
      
      // Load our ES6 modules
      loadModules()
        .then(success => {
          if (success) {
            console.log('All modules loaded successfully');
            
            // Smart-account UI badge disabled; nothing else to do here.
          } else {
            console.warn('Some modules failed to load');
          }
        });
    };
    
    ethersScript.onerror = function() {
      console.error('Failed to load ethers library from local path. Trying CDN...');
      
      // Try CDN as fallback
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
      cdnScript.type = 'text/javascript';
      
      cdnScript.onload = function() {
        console.log('ethers library loaded from CDN');
        loadModules().then(success => {
          if (success) {
            console.log('All modules loaded successfully');
            // badge disabled
          }
        });
      };
      
      cdnScript.onerror = function() {
        console.error('Failed to load ethers library from CDN. Features requiring ethers.js will not work.');
      };
      
      document.head.appendChild(cdnScript);
    };
    
    document.head.appendChild(ethersScript);
  } else {
    console.log('Ethers already loaded, proceeding with module loading');
    loadModules().then(success => {
      if (success) {
        console.log('All modules loaded successfully');
        // badge disabled
      }
    });
  }
  
  // Set up event listener for gas token toggle
  const gasTokenToggle = document.getElementById('enable-swap-recommendations');
  if (gasTokenToggle) {
    gasTokenToggle.addEventListener('change', function() {
      window.enableSwapRecommendations = this.checked;
      localStorage.setItem('stbchef_enable_swap_recommendations', window.enableSwapRecommendations);
      console.log(`Gas token payment ${window.enableSwapRecommendations ? 'enabled' : 'disabled'}`);
    });
  }
  
  // Set up listeners for swap form
  setupSwapForm();
});

// Setup swap form functionality
function setupSwapForm() {
  // Update swap direction and balance info
  const updateSwapFormInfo = () => {
    const swapDirectionInputs = document.querySelectorAll('input[name="swap-direction"]');
    const swapCurrencyEl = document.getElementById('swap-currency');
    const swapBalanceEl = document.getElementById('swap-balance');
    
    // Find selected direction
    let selectedDirection = 'eth-to-usdc'; // Default
    swapDirectionInputs.forEach(radio => {
      if (radio.checked) {
        selectedDirection = radio.value;
      }
    });
    
    if (selectedDirection === 'eth-to-usdc') {
      if (swapCurrencyEl) swapCurrencyEl.textContent = 'ETH';
      
      // Update balance display
      if (swapBalanceEl && window.walletBalances && window.walletBalances.eth !== undefined) {
        swapBalanceEl.textContent = `Balance: ${window.walletBalances.eth.toFixed(4)} ETH`;
      } else if (swapBalanceEl) {
        swapBalanceEl.textContent = 'Balance: 0.00 ETH';
      }
    } else {
      if (swapCurrencyEl) swapCurrencyEl.textContent = 'USDC';
      
      // Update balance display
      if (swapBalanceEl && window.walletBalances && window.walletBalances.usdc !== undefined) {
        swapBalanceEl.textContent = `Balance: ${window.walletBalances.usdc.toFixed(2)} USDC`;
      } else if (swapBalanceEl) {
        swapBalanceEl.textContent = 'Balance: 0.00 USDC';
      }
    }
  };
  
  // Run initially
  updateSwapFormInfo();
  
  // Setup event listeners for swap direction changes
  const swapDirectionInputs = document.querySelectorAll('input[name="swap-direction"]');
  swapDirectionInputs.forEach(radio => {
    radio.addEventListener('change', updateSwapFormInfo);
  });
  
  // Cached DOM refs
  const executeSwapBtn = document.getElementById('execute-swap-btn');

  // -------------------------- helpers ----------------------------------
  // Enable / disable swap button depending on readiness
  async function refreshSwapButtonState() {
    if (!executeSwapBtn) return;

    // Preconditions: wallet connected & ethers provider available
    if (!window.userAccount || !window.ethersProvider || typeof window.TokenAddresses === 'undefined') {
      executeSwapBtn.disabled = true;
      executeSwapBtn.title = 'Connect wallet to enable swaps';
      return;
    }

    try {
      const network = await window.ethersProvider.getNetwork();
      const chainId = Number(network.chainId);

      // Determine USDC address for this network
      let usdcAddress;
      switch (chainId) {
        case 1:
          usdcAddress = window.TokenAddresses.USDC_ETHEREUM;
          break;
        case 59144:
          usdcAddress = window.TokenAddresses.USDC_LINEA;
          break;
        case 59140:
        case 31337:
          usdcAddress = window.TokenAddresses.USDC_LINEA_TESTNET;
          break;
        default:
          usdcAddress = null;
      }

      // Resolve SimpleSwap address from DEPLOYED_CONTRACTS map that smartAccount.js sets
      const contracts = window.DEPLOYED_CONTRACTS || {};
      const simpleSwapAddress = contracts.simpleSwap ? contracts.simpleSwap[String(chainId)] : null;

      // Networks that use Kyber aggregator directly don't need SimpleSwap
      const kyberSupported = chainId === 1 || chainId === 59144;

      console.log('[swap] refreshSwapButtonState', { chainId, usdcAddress, kyberSupported, simpleSwapAddress });

      if (!usdcAddress || (!kyberSupported && !simpleSwapAddress)) {
        // Disable if missing required contract/address for this network
        executeSwapBtn.disabled = true;
        executeSwapBtn.title = 'Swap not available on this network yet';
      } else {
        // Enable for Kyber-supported or when SimpleSwap present
        executeSwapBtn.disabled = false;
        executeSwapBtn.title = '';
      }
      console.log('[swap] executeSwapBtn.disabled =', executeSwapBtn.disabled);
    } catch (err) {
      console.warn('[swap] Unable to compute readiness', err);
      executeSwapBtn.disabled = true;
      executeSwapBtn.title = 'Swap temporarily unavailable';
    }
  }

  // -------------------------- click logic ------------------------------
  async function handleExecuteSwapClick() {
    console.log('[moduleLoader executeSwapBtn] Clicked.');
    const direction = document.querySelector('input[name="swap-direction"]:checked').value;
    const amountInput = document.getElementById('swap-amount');
    const amount = parseFloat(amountInput?.value || '0');
    const useGasToken = document.querySelector('input[name="gas-token"]:checked').value === 'usdc';
    
    console.log('[moduleLoader executeSwapBtn] State before checks: userAccount:', window.userAccount, 'ethersProvider:', window.ethersProvider);

    if (isNaN(amount) || amount <= 0) {
      window.showNotification('Please enter a valid amount', 'error');
      return;
    }
    
    // Check wallet connection
    if (!window.userAccount || !window.ethersProvider) {
      console.error('[moduleLoader executeSwapBtn] Wallet/Provider check FAILED. userAccount:', window.userAccount, 'ethersProvider:', window.ethersProvider);
      window.showNotification('Please connect your wallet first', 'error');
      return;
    }
    console.log('[moduleLoader executeSwapBtn] Wallet/Provider check PASSED.');
    
    // Force reinitialize ethers provider to make sure we have the correct network
    // Let's re-enable this to ensure the provider is fresh for the current network.
    console.log('[moduleLoader executeSwapBtn] Calling initializeEthersProvider before swap execution...');
    await initializeEthersProvider(); 
    console.log('[moduleLoader executeSwapBtn] initializeEthersProvider completed. New provider state:', window.ethersProvider);
    
    console.log(`[moduleLoader executeSwapBtn] Executing ${direction} swap for ${amount} with gas token: ${useGasToken}`);
    
    try {
      if (direction === 'eth-to-usdc') {
        if (typeof window.swapEthToUsdc === 'function') {
          const result = await window.swapEthToUsdc(amount, useGasToken);
          if (result.status === 'success') {
            window.showNotification(`Swap successful: ${amount} ETH to USDC`, 'success');
            document.getElementById('swap-modal').classList.add('hidden');
          } else {
            window.showNotification(`Swap failed: ${result.message}`, 'error');
          }
        } else {
          throw new Error('Swap functionality not available');
        }
      } else {
        if (typeof window.swapUsdcToEth === 'function') {
          const result = await window.swapUsdcToEth(amount, useGasToken);
          if (result.status === 'success') {
            window.showNotification(`Swap successful: ${amount} USDC to ETH`, 'success');
            document.getElementById('swap-modal').classList.add('hidden');
          } else {
            window.showNotification(`Swap failed: ${result.message}`, 'error');
          }
        } else {
          throw new Error('Swap functionality not available');
        }
      }
    } catch (error) {
      window.showNotification(`Error executing swap: ${error.message}`, 'error');
    }
  }

  // Attach click handler once
  if (executeSwapBtn) {
    executeSwapBtn.addEventListener('click', handleExecuteSwapClick);
  }

  // Run once and also whenever wallet/network changes
  refreshSwapButtonState();
  if (window.setupMetaMaskEventListeners) {
    window.setupMetaMaskEventListeners({ onNetworkChanged: refreshSwapButtonState, onAccountsChanged: refreshSwapButtonState });
  }

  // Add open/close modal event listeners
  const executeTradeBtn = document.getElementById('execute-trade-btn');
  const closeSwapModalBtn = document.getElementById('close-swap-modal');
  const swapModal = document.getElementById('swap-modal');
  
  if (executeTradeBtn && swapModal) {
    executeTradeBtn.addEventListener('click', async function() {
      // Update balance & button state each time modal opens
      updateSwapFormInfo();
      await refreshSwapButtonState();
      if (executeSwapBtn) {
        console.log('[swap-modal] executeSwapBtn disabled state on open:', executeSwapBtn.disabled);
      }
      swapModal.classList.remove('hidden');
    });
  }
  
  if (closeSwapModalBtn && swapModal) {
    closeSwapModalBtn.addEventListener('click', function() {
      swapModal.classList.add('hidden');
    });
  }
}

// Expose module loader globally
window.loadModules = loadModules;
window.initializeEthersProvider = initializeEthersProvider; 