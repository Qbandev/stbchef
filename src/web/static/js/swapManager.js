// Swap Manager for Simple Crypto Trading Bot Chef
// Implements trading functionality with real swap execution

// Use global ethers variable instead of ES module import
import { createSmartAccount, buildPectraTx, executeSwap, TokenAddresses } from './smartAccount.js';

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

// KyberSwap Aggregator constants & helpers (Linea only)
const KYBER_CHAIN = 'linea';
const KYBER_BASE_URL = `https://aggregator-api.kyberswap.com/${KYBER_CHAIN}`;
const KYBER_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Minimal ERC20 ABI (allowance & approve)
const MIN_ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// --- KyberSwap config ---------------------------------------------------------
// Based on Kyber docs, extremely small swap amounts may not return a route.
// Empirically, require at least ~0.001 ETH or ~1 USDC when using the aggregator.
const KYBER_MIN_ETH_WEI = ethers.utils.parseEther('0.001'); // 1e15 wei
const KYBER_MIN_USDC = ethers.BigNumber.from('1000000'); // 1 USDC (6 decimals)

/**
 * Initialize the swap manager
 * @param {Web3} web3 - Web3 instance
 * @returns {Promise<void>}
 */
export async function initSwapManager(web3) {
  try {
    console.log('[swapManager] Initializing swap manager...');
    
    // Rely on window.ethersProvider set by initializeEthersProvider in moduleLoader.js
    if (!window.ethersProvider) {
      console.error('[swapManager initSwapManager] window.ethersProvider NOT found! It should be set by initializeEthersProvider.');
      // Fallback: If absolutely necessary, try to create, but this indicates a flow issue.
      if (!window.ethereum) {
        console.error('[swapManager initSwapManager] window.ethereum NOT found for fallback!');
        throw new Error('No Ethereum provider found to initialize fallback provider in swapManager.');
      }
      window.ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      console.warn('[swapManager initSwapManager] Fallback: Created new ethersProvider in initSwapManager.');
      await window.ethersProvider.ready; // Ensure this fallback provider is ready too
    }
    
    console.log('[swapManager initSwapManager] Using existing ethers provider:', window.ethersProvider);
    
    // Get network information from the existing provider
    const network = await window.ethersProvider.getNetwork();
    console.log(`[swapManager initSwapManager] Connected to network: ${network.name} (chainId: ${network.chainId})`);
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
  console.log('[swapManager] swapEthToUsdc: START. userAccount:', window.userAccount, 'ethersProvider:', window.ethersProvider);
  try {
    console.log('[swapManager] swapEthToUsdc called. Amount:', ethAmount, 'Use Gas Token:', useGasToken);
    console.log('[swapManager] window.ethersProvider:', window.ethersProvider);
    console.log('[swapManager] window.userAccount:', window.userAccount);

    if (!window.ethersProvider) {
      console.error('[swapManager] swapEthToUsdc: window.ethersProvider is MISSING!');
      throw new Error('Swap manager not initialized (no ethersProvider)');
    }
    
    if (!window.userAccount) {
      console.error('[swapManager] swapEthToUsdc: window.userAccount is MISSING!');
      throw new Error('No wallet connected');
    }
    
    // Get the current network details first
    const network = await window.ethersProvider.getNetwork();
    console.log(`Current network: ${network.name} (chainId: ${network.chainId})`);
    
    // Get the signer from provider - make sure we're using the current network
    const signer = window.ethersProvider.getSigner();
    
    // Convert ETH amount to wei
    const ethWei = ethers.utils.parseEther(ethAmount.toString());
    
    // Ensure user has enough ETH for amount + estimated gas buffer (~0.0002 ETH)
    const gasBufferWei = ethers.utils.parseEther('0.0002');
    const ethBalanceWei = ethers.utils.parseEther(window.walletBalances.eth.toString());
    if (ethWei.add(gasBufferWei).gt(ethBalanceWei)) {
      showNotification('Insufficient ETH balance to cover swap amount plus gas fees. Reduce amount or top-up.', 'error');
      return { status: 'error', message: 'Not enough ETH for amount + gas' };
    }
    
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
    
    let txHash;
    if (chainId === 59144) {
      // Use KyberSwap Aggregator on Linea
      txHash = await executeKyberSwap(signer, KYBER_ETH_ADDRESS, usdcAddress, ethWei);
    } else {
      // Fallback to legacy SimpleSwap path (local, testnet, etc.)
      txHash = await executeSwap(
        signer,
        NATIVE_ETH,
        usdcAddress,
        ethWei,
        useGasToken
      );
    }
    
    // Add to recent swaps
    const swapRecord = {
      timestamp: Date.now(),
      chainId,
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
  console.log('[swapManager] swapUsdcToEth: START. userAccount:', window.userAccount, 'ethersProvider:', window.ethersProvider);
  try {
    console.log('[swapManager] swapUsdcToEth called. Amount:', usdcAmount, 'Use Gas Token:', useGasToken);
    console.log('[swapManager] window.ethersProvider:', window.ethersProvider);
    console.log('[swapManager] window.userAccount:', window.userAccount);

    if (!window.ethersProvider) {
      console.error('[swapManager] swapUsdcToEth: window.ethersProvider is MISSING!');
      throw new Error('Swap manager not initialized (no ethersProvider)');
    }
    
    if (!window.userAccount) {
      console.error('[swapManager] swapUsdcToEth: window.userAccount is MISSING!');
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
    
    let txHash;
    if (chainId === 59144) {
      // Kyber path on Linea
      txHash = await executeKyberSwap(signer, usdcAddress, KYBER_ETH_ADDRESS, usdcAmountSmallestUnit);
    } else {
      txHash = await executeSwap(
        signer,
        usdcAddress,
        NATIVE_ETH,
        usdcAmountSmallestUnit,
        useGasToken
      );
    }
    
    // Add to recent swaps
    const swapRecord = {
      timestamp: Date.now(),
      chainId,
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
    console.log('[swapManager] executeAIRecommendedSwap called. Model:', model, 'Action:', action, 'Confidence:', confidence, 'Use Gas Token:', useGasToken);
    console.log('[swapManager] window.userAccount for AI Swap:', window.userAccount);
    console.log('[swapManager] window.walletBalances for AI Swap:', window.walletBalances);

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
  
  // If no local history, try to get simulated transactions -- THIS LOGIC IS NOW REMOVED
  // try {
  //   const simulatedTxs = getSimulatedTransactions(); // This function was removed
    
  //   // Convert to our expected format
  //   return simulatedTxs.map(tx => ({
  //     timestamp: tx.timestamp,
  //     txHash: tx.hash,
  //     fromToken: tx.fromToken,
  //     toToken: tx.toToken,
  //     fromAmount: parseFloat(ethers.utils.formatEther(tx.amount)),
  //     estimatedToAmount: 0, // We don't have this in simulated transactions
  //     status: 'SUCCESSFUL' // All simulated transactions are successful
  //   }));
  // } catch (e) {
  //   console.error('Error getting simulated transactions:', e);
  //   return []; // Return empty if simulated also fails or is not available
  // }
  return []; // Always return empty array if no real recentSwaps, as simulation is gone
}

/**
 * Show a confirmation dialog for the swap
 * @param {Object} params - Swap parameters
 * @returns {Promise<boolean>} - Whether the user confirmed the swap
 */
async function showSwapConfirmation(params) {
  console.log('[swapManager] showSwapConfirmation called with params:', params);
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

/**
 * Query KyberSwap Aggregator Encode API (single-call legacy) to get encoded calldata.
 * @param {string} tokenIn - Address of input token (ETH: KYBER_ETH_ADDRESS)
 * @param {string} tokenOut - Address of output token
 * @param {string} amountInWei - Amount in wei (string)
 * @param {string} recipient - Address that will receive output tokens
 * @param {number} slippageBps - Slippage tolerance in basis points (default 50 = 0.5%)
 * @returns {Promise<Object>} - Response data containing encodedSwapData, routerAddress, transactionValue
 */
async function kyberGetEncodedSwap(tokenIn, tokenOut, amountInWei, recipient, slippageBps = 50) {
  const params = new URLSearchParams({
    tokenIn,
    tokenOut,
    amountIn: amountInWei.toString(),
    to: recipient,
    slippageTolerance: slippageBps.toString()
  });

  const url = `${KYBER_BASE_URL}/route/encode?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'X-Client-Id': 'stbchef' }
  });
  const json = await res.json();

  // Format A (latest APIs): direct payload with encodedSwapData on top level
  if (json.encodedSwapData) {
    return json; // success
  }

  // Format B (legacy): { code, data }
  if (typeof json.code !== 'undefined') {
    if (json.code === 0 && json.data) {
      return json.data;
    }
    console.error('[Kyber API] Error response', json);
    const errMsg = json.message || (json.code === 4008 ? 'No route for given amount – try a larger amount.' : `KyberSwap API error (code ${json.code})`);
    throw new Error(errMsg);
  }

  // Unknown format – treat as error
  console.error('[Kyber API] Unrecognised response', json);
  throw new Error('Unexpected KyberSwap API response');
}

/**
 * Execute a KyberSwap swap on Linea.
 * Handles both native ETH in/out and ERC-20 paths.
 * @param {ethers.Signer} signer
 * @param {string} tokenIn
 * @param {string} tokenOut
 * @param {ethers.BigNumber} amountInWei
 * @param {number} slippageBps
 * @returns {Promise<string>} tx hash
 */
async function executeKyberSwap(signer, tokenIn, tokenOut, amountInWei, slippageBps = 50) {
  const sender = await signer.getAddress();
  // Step 1: Query Kyber encode API
  // Guard against tiny amounts that Kyber can't quote
  if (tokenIn.toLowerCase() === KYBER_ETH_ADDRESS.toLowerCase() && amountInWei.lt(KYBER_MIN_ETH_WEI)) {
    throw new Error('KyberSwap requires at least 0.001 ETH for swaps on Linea');
  }
  if (tokenIn.toLowerCase() !== KYBER_ETH_ADDRESS.toLowerCase() && amountInWei.lt(KYBER_MIN_USDC)) {
    throw new Error('KyberSwap requires at least 1 USDC for swaps on Linea');
  }

  const swapInfo = await kyberGetEncodedSwap(tokenIn, tokenOut, amountInWei.toString(), sender, slippageBps);
  const { encodedSwapData, routerAddress, transactionValue } = swapInfo;

  // Step 2: Approve router if input token is ERC-20 and allowance insufficient
  if (tokenIn.toLowerCase() !== KYBER_ETH_ADDRESS.toLowerCase()) {
    const erc20 = new ethers.Contract(tokenIn, MIN_ERC20_ABI, signer);
    const allowance = await erc20.allowance(sender, routerAddress);
    if (allowance.lt(amountInWei)) {
      const approveTx = await erc20.approve(routerAddress, amountInWei);
      await approveTx.wait();
    }
  }

  // Step 3: Send swap transaction
  const tx = await signer.sendTransaction({
    to: routerAddress,
    data: encodedSwapData,
    value: transactionValue ? ethers.BigNumber.from(transactionValue) : (tokenIn.toLowerCase() === KYBER_ETH_ADDRESS.toLowerCase() ? amountInWei : 0)
  });
  await tx.wait();
  return tx.hash;
}

// Attach to window for global access
window.swapEthToUsdc = swapEthToUsdc;
window.swapUsdcToEth = swapUsdcToEth;
window.executeAIRecommendedSwap = executeAIRecommendedSwap;
window.getRecentSwaps = getRecentSwaps; 