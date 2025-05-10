// Swap Manager for Simple Crypto Trading Bot Chef
// Implements trading functionality with real swap execution

// Use global ethers variable instead of ES module import
import { createSmartAccount, buildPectraTx, executeSwap, TokenAddresses, getSimulatedTransactions } from './smartAccount.js';

// Common token addresses (0x00...00 represents native ETH)
const NATIVE_ETH = '0x0000000000000000000000000000000000000000';

// Swap statuses
export const SwapStatus = {
  PENDING: 'pending',
  SUCCESSFUL: 'successful', 
  FAILED: 'failed'
};

// Tracking for recent swaps
const recentSwaps = [];

/**
 * Initialize the swap manager
 * @param {Web3} web3 - Web3 instance
 * @returns {Promise<void>}
 */
export async function initSwapManager(web3) {
  try {
    console.log('Initializing swap manager...');
    
    // Convert Web3 provider to ethers provider
    if (!window.ethereum) {
      throw new Error('No Ethereum provider found');
    }
    
    const ethereumProvider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Attach the provider to window for easy access
    window.ethersProvider = ethereumProvider;
    
    console.log('Swap manager initialized with ethers provider');
    
    // Get network information
    const network = await ethereumProvider.getNetwork();
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
  } catch (error) {
    console.error('Error initializing swap manager:', error);
    throw error;
  }
}

/**
 * Execute an ETH to USDC swap
 * @param {number} ethAmount - Amount of ETH to swap
 * @param {boolean} useGasToken - Whether to pay gas in USDC
 * @returns {Promise<Object>} - Result object with transaction hash and status
 */
export async function swapEthToUsdc(ethAmount, useGasToken = false) {
  try {
    if (!window.ethersProvider) {
      throw new Error('Swap manager not initialized');
    }
    
    if (!window.userAccount) {
      throw new Error('No wallet connected');
    }
    
    // Get the current network details first
    const network = await window.ethersProvider.getNetwork();
    console.log(`Current network: ${network.name} (chainId: ${network.chainId})`);
    
    // Get the signer from provider - make sure we're using the current network
    const signer = window.ethersProvider.getSigner();
    
    // Convert ETH amount to wei
    const ethWei = ethers.utils.parseEther(ethAmount.toString());
    
    // Get the chain ID to determine which USDC address to use
    const chainId = network.chainId;
    
    // Determine the USDC address based on network
    let usdcAddress;
    if (chainId === 1) {
      // Ethereum mainnet
      usdcAddress = TokenAddresses.USDC_ETHEREUM;
    } else if (chainId === 59144) {
      // Linea
      usdcAddress = TokenAddresses.USDC_LINEA;
    } else if (chainId === 59140) {
      // Linea Testnet
      usdcAddress = TokenAddresses.USDC_LINEA_TESTNET;
    } else if (chainId === 31337) {
      // Local Hardhat Network
      usdcAddress = TokenAddresses.USDC_LINEA_TESTNET; // Using testnet address for local testing
    } else {
      throw new Error(`Unsupported network: ${chainId}. Please switch to Ethereum mainnet, Linea, Linea Testnet, or Local Hardhat Network.`);
    }
    
    // Show confirmation dialog
    const confirmed = await showSwapConfirmation({
      fromToken: 'ETH',
      toToken: 'USDC',
      fromAmount: ethAmount,
      estimatedUSDC: ethAmount * window.walletBalances.ethusd,
      gasToken: useGasToken ? 'USDC' : 'ETH'
    });
    
    if (!confirmed) {
      return { status: 'cancelled', message: 'User cancelled the swap' };
    }
    
    // Create UI notification
    showNotification(`Swapping ${ethAmount} ETH to USDC...`, 'info');
    
    // Show loading state in wallet card
    window.showLoadingWalletState(`Processing ${ethAmount} ETH to USDC swap...`);
    
    // Execute the swap
    const txHash = await executeSwap(
      signer, 
      NATIVE_ETH,
      usdcAddress,
      ethWei,
      useGasToken
    );
    
    // Add to recent swaps
    const swapRecord = {
      timestamp: Date.now(),
      txHash,
      fromToken: 'ETH',
      toToken: 'USDC',
      fromAmount: ethAmount,
      estimatedToAmount: ethAmount * window.walletBalances.ethusd,
      status: SwapStatus.SUCCESSFUL
    };
    recentSwaps.unshift(swapRecord);
    
    // Limit to 10 recent swaps
    if (recentSwaps.length > 10) {
      recentSwaps.pop();
    }
    
    // Refresh wallet balances after swap
    setTimeout(() => {
      window.getWalletBalances();
    }, 5000); // Wait 5 seconds for transaction to be processed
    
    return {
      status: 'success',
      txHash,
      message: `Successfully swapped ${ethAmount} ETH to USDC`
    };
  } catch (error) {
    console.error('Error executing ETH to USDC swap:', error);
    
    // Update UI
    showNotification(`Error swapping ETH to USDC: ${error.message}`, 'error');
    
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Execute a USDC to ETH swap based on AI recommendations
 * @param {number} usdcAmount - Amount of USDC to swap
 * @param {boolean} useGasToken - Whether to pay gas in USDC
 * @returns {Promise<Object>} - Result object with transaction hash and status
 */
export async function swapUsdcToEth(usdcAmount, useGasToken = false) {
  try {
    if (!window.ethersProvider) {
      throw new Error('Swap manager not initialized');
    }
    
    if (!window.userAccount) {
      throw new Error('No wallet connected');
    }
    
    // Get the current network details first
    const network = await window.ethersProvider.getNetwork();
    console.log(`Current network: ${network.name} (chainId: ${network.chainId})`);
    
    // Get the signer from provider - make sure we're using the current network
    const signer = window.ethersProvider.getSigner();
    
    // Get the chain ID to determine which USDC address to use
    const chainId = network.chainId;
    
    // Determine the USDC address based on network
    let usdcAddress;
    if (chainId === 1) {
      // Ethereum mainnet
      usdcAddress = TokenAddresses.USDC_ETHEREUM;
    } else if (chainId === 59144) {
      // Linea
      usdcAddress = TokenAddresses.USDC_LINEA;
    } else if (chainId === 59140) {
      // Linea Testnet
      usdcAddress = TokenAddresses.USDC_LINEA_TESTNET;
    } else if (chainId === 31337) {
      // Local Hardhat Network
      usdcAddress = TokenAddresses.USDC_LINEA_TESTNET; // Using testnet address for local testing
    } else {
      throw new Error(`Unsupported network: ${chainId}. Please switch to Ethereum mainnet, Linea, Linea Testnet, or Local Hardhat Network.`);
    }
    
    // Convert USDC amount to smallest unit (6 decimals)
    const usdcAmountSmallestUnit = ethers.utils.parseUnits(usdcAmount.toString(), 6);
    
    // Show confirmation dialog
    const ethPrice = window.walletBalances.ethusd;
    const estimatedEth = ethPrice > 0 ? usdcAmount / ethPrice : 0;
    
    const confirmed = await showSwapConfirmation({
      fromToken: 'USDC',
      toToken: 'ETH',
      fromAmount: usdcAmount,
      estimatedETH: estimatedEth,
      gasToken: useGasToken ? 'USDC' : 'ETH'
    });
    
    if (!confirmed) {
      return { status: 'cancelled', message: 'User cancelled the swap' };
    }
    
    // Create UI notification
    showNotification(`Swapping ${usdcAmount} USDC to ETH...`, 'info');
    
    // Show loading state in wallet card
    window.showLoadingWalletState(`Processing ${usdcAmount} USDC to ETH swap...`);
    
    // Execute the swap
    const txHash = await executeSwap(
      signer, 
      usdcAddress,
      NATIVE_ETH,
      usdcAmountSmallestUnit,
      useGasToken
    );
    
    // Add to recent swaps
    const swapRecord = {
      timestamp: Date.now(),
      txHash,
      fromToken: 'USDC',
      toToken: 'ETH',
      fromAmount: usdcAmount,
      estimatedToAmount: estimatedEth,
      status: SwapStatus.SUCCESSFUL
    };
    recentSwaps.unshift(swapRecord);
    
    // Limit to 10 recent swaps
    if (recentSwaps.length > 10) {
      recentSwaps.pop();
    }
    
    // Refresh wallet balances after swap
    setTimeout(() => {
      window.getWalletBalances();
    }, 5000); // Wait 5 seconds for transaction to be processed
    
    return {
      status: 'success',
      txHash,
      message: `Successfully swapped ${usdcAmount} USDC to ETH`
    };
  } catch (error) {
    console.error('Error executing USDC to ETH swap:', error);
    
    // Update UI
    showNotification(`Error swapping USDC to ETH: ${error.message}`, 'error');
    
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Execute a swap based on AI model recommendations
 * @param {string} model - Model making the recommendation
 * @param {string} action - BUY or SELL
 * @param {number} confidence - Model confidence (0-1)
 * @param {boolean} useGasToken - Whether to pay gas in ERC-20
 * @returns {Promise<Object>} - Result object with transaction hash and status
 */
export async function executeAIRecommendedSwap(model, action, confidence, useGasToken = false) {
  try {
    // Validate inputs
    if (!window.userAccount) {
      throw new Error('No wallet connected');
    }
    
    if (!window.walletBalances) {
      throw new Error('Wallet balances not available');
    }
    
    if (action !== 'BUY' && action !== 'SELL') {
      throw new Error('Invalid action: must be BUY or SELL');
    }
    
    // Get current balances and price
    const ethBalance = window.walletBalances.eth || 0;
    const usdcBalance = window.walletBalances.usdc || 0;
    const ethPrice = window.walletBalances.ethusd || 0;
    
    if (ethPrice <= 0) {
      throw new Error('Invalid ETH price');
    }
    
    // Calculate swap amount based on confidence and balances
    let swapAmount = 0;
    
    if (action === 'BUY') {
      // For BUY: Use portion of USDC balance based on confidence
      // Higher confidence = larger portion
      const maxSwapPercentage = 0.3; // Max 30% of balance
      const swapPercentage = confidence * maxSwapPercentage;
      swapAmount = usdcBalance * swapPercentage;
      
      // Minimum swap amount of $10 or 10% of balance, whichever is smaller
      const minSwapAmount = Math.min(10, usdcBalance * 0.1);
      
      // Maximum 90% of balance
      const maxSwapAmount = usdcBalance * 0.9;
      
      // Apply limits
      swapAmount = Math.max(swapAmount, minSwapAmount);
      swapAmount = Math.min(swapAmount, maxSwapAmount);
      
      // Execute the swap
      return await swapUsdcToEth(swapAmount, useGasToken);
    } else {
      // For SELL: Use portion of ETH balance based on confidence
      // Higher confidence = larger portion
      const maxSwapPercentage = 0.3; // Max 30% of balance
      const swapPercentage = confidence * maxSwapPercentage;
      swapAmount = ethBalance * swapPercentage;
      
      // Minimum swap amount of 0.01 ETH or 10% of balance, whichever is smaller
      const minSwapAmount = Math.min(0.01, ethBalance * 0.1);
      
      // Maximum 90% of balance
      const maxSwapAmount = ethBalance * 0.9;
      
      // Apply limits
      swapAmount = Math.max(swapAmount, minSwapAmount);
      swapAmount = Math.min(swapAmount, maxSwapAmount);
      
      // Execute the swap
      return await swapEthToUsdc(swapAmount, useGasToken);
    }
  } catch (error) {
    console.error('Error executing AI recommended swap:', error);
    
    // Update UI
    showNotification(`Error executing recommended swap: ${error.message}`, 'error');
    
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Get recent swap history
 * @returns {Array} - Array of recent swap objects
 */
export function getRecentSwaps() {
  // First check for local history
  if (recentSwaps && recentSwaps.length > 0) {
    return [...recentSwaps];
  }
  
  // If no local history, try to get simulated transactions
  try {
    const simulatedTxs = getSimulatedTransactions();
    
    // Convert to our expected format
    return simulatedTxs.map(tx => ({
      timestamp: tx.timestamp,
      txHash: tx.hash,
      fromToken: tx.fromToken,
      toToken: tx.toToken,
      fromAmount: parseFloat(ethers.utils.formatEther(tx.amount)),
      estimatedToAmount: 0, // We don't have this in simulated transactions
      status: 'SUCCESSFUL' // All simulated transactions are successful
    }));
  } catch (e) {
    console.error('Error getting simulated transactions:', e);
    return [];
  }
}

/**
 * Show a confirmation dialog for the swap
 * @param {Object} params - Swap parameters
 * @returns {Promise<boolean>} - Whether the user confirmed the swap
 */
async function showSwapConfirmation(params) {
  return new Promise((resolve) => {
    // Create modal background
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    
    // Create confirmation dialog
    let content = '';
    if (params.fromToken === 'ETH') {
      content = `
        <div class="bg-cyber-dark p-6 rounded-lg shadow-lg max-w-md w-full border border-blue-500">
          <h3 class="text-xl font-bold mb-4 text-blue-400">Confirm Swap</h3>
          <div class="space-y-3 mb-4">
            <div class="flex justify-between">
              <span class="text-gray-300">From:</span>
              <span class="font-bold text-white">${params.fromAmount.toFixed(6)} ETH</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">To (estimated):</span>
              <span class="font-bold text-white">${params.estimatedUSDC.toFixed(2)} USDC</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">Gas paid in:</span>
              <span class="font-bold text-white">${params.gasToken}</span>
            </div>
          </div>
          <div class="flex justify-between space-x-3">
            <button id="cancel-swap" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded">Cancel</button>
            <button id="confirm-swap" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded">Confirm Swap</button>
          </div>
        </div>
      `;
    } else {
      content = `
        <div class="bg-cyber-dark p-6 rounded-lg shadow-lg max-w-md w-full border border-blue-500">
          <h3 class="text-xl font-bold mb-4 text-blue-400">Confirm Swap</h3>
          <div class="space-y-3 mb-4">
            <div class="flex justify-between">
              <span class="text-gray-300">From:</span>
              <span class="font-bold text-white">${params.fromAmount.toFixed(2)} USDC</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">To (estimated):</span>
              <span class="font-bold text-white">${params.estimatedETH.toFixed(6)} ETH</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">Gas paid in:</span>
              <span class="font-bold text-white">${params.gasToken}</span>
            </div>
          </div>
          <div class="flex justify-between space-x-3">
            <button id="cancel-swap" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded">Cancel</button>
            <button id="confirm-swap" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded">Confirm Swap</button>
          </div>
        </div>
      `;
    }
    
    modal.innerHTML = content;
    document.body.appendChild(modal);
    
    // Handle button clicks
    document.getElementById('cancel-swap').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    document.getElementById('confirm-swap').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });
  });
}

// Attach to window for global access
window.swapEthToUsdc = swapEthToUsdc;
window.swapUsdcToEth = swapUsdcToEth;
window.executeAIRecommendedSwap = executeAIRecommendedSwap;
window.getRecentSwaps = getRecentSwaps; 