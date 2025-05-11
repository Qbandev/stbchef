// Smart Account functionality for Simple Crypto Trading Bot Chef
// Implements EIP-7702 support for Ethereum Pectra upgrade

// Contract addresses (to be filled after deployment)
export const DEPLOYED_CONTRACTS = {
  "smartAccount": "0xC1a6875BDc2CA3FB47B36EdD56fE65034F1D7454",
  "simpleSwap": {
    "31337": "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e", // Localhost Hardhat
    "59140": "",
    "59144": "0x067f5703e07511c25379F41B11a113aC9fBA958b"
  }
};

// ABI for the Smart Account contract
const SmartAccountABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sessionKey",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      }
    ],
    "name": "addSessionKey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum Feature",
        "name": "feature",
        "type": "uint8"
      }
    ],
    "name": "enableFeature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "execute",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "targets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "values",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes[]",
        "name": "datas",
        "type": "bytes[]"
      }
    ],
    "name": "executeBatch",
    "outputs": [
      {
        "internalType": "bytes[]",
        "name": "",
        "type": "bytes[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ABI for SimpleSwap contract
const SimpleSwapABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_usdcAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_initialEthPrice",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "getEthPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      }
    ],
    "name": "getQuoteEthToUsdc",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      }
    ],
    "name": "getQuoteUsdcToEth",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "swapEthToUsdc",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      }
    ],
    "name": "swapUsdcToEth",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ABI for ERC20 token contract
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_to", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_spender", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {"name": "_owner", "type": "address"},
      {"name": "_spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  }
];

// Feature enum values
export const Feature = {
  SessionKeys: 0,
  BatchTransactions: 1,
  GasTokenPayment: 2
};

// Token addresses for different networks
export const TokenAddresses = {
  // Ethereum tokens
  USDC_ETHEREUM: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  
  // Linea tokens 
  USDC_LINEA: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
  
  // Linea Testnet tokens (and localhost MockUSDC)
  USDC_LINEA_TESTNET: '0x0165878A594ca255338adfa4d48449f69242Eb8F', // Address of MockUSDC deployed to localhost
  
  // Native ETH is represented as 0x00...00
  NATIVE_ETH: '0x0000000000000000000000000000000000000000'
};

// Track created smart accounts
let smartAccounts = {};

/**
 * Create a temporary smart account for an EOA
 * @param {ethers.Signer} signer - The signer (from MetaMask)
 * @returns {Promise<string>} - The smart account address
 */
export async function createSmartAccount(signer) {
  try {
    // console.log('[smartAccount] Creating EIP-7702 smart account...');
    
    // Check if we already have a smart account for this signer
    const signerAddress = await signer.getAddress();
    if (smartAccounts[signerAddress]) {
      // console.log('Smart account already exists for this address');
      return smartAccounts[signerAddress];
    }
    
    // Get network info
    const provider = signer.provider;
    let network = { chainId: 1, name: 'unknown' }; // Default to Ethereum mainnet
    
    if (provider) {
      try {
        network = await provider.getNetwork();
        // console.log(`[smartAccount] Creating smart account on network: ${network.name} (chainId: ${network.chainId})`);
      } catch (networkError) {
        // console.error('[smartAccount] Error getting network from provider:', networkError);
      }
    }
    
    // Calculate the expected address
    // Logic from the original 'else' block of SIMULATION_MODE check is now the default
    // In the real implementation, here we would interact with a factory contract
    // For now, we'll assume the contract is already deployed and just need to be connected
    
    // Set contract address based on chain ID
    let smartAccountAddress = DEPLOYED_CONTRACTS.smartAccount;
    
    // If we don't have an address yet, we'll deploy a new one
    if (!smartAccountAddress) {
      // console.log("[smartAccount] Deploying a new smart account contract...");
      const factory = new ethers.ContractFactory(SmartAccountABI, [], signer);
      const smartAccount = await factory.deploy();
      await smartAccount.deployTransaction.wait();
      
      smartAccountAddress = smartAccount.address;
      // console.log(`[smartAccount] New smart account deployed at: ${smartAccountAddress}`);
      
      // Enable features
      await smartAccount.enableFeature(Feature.SessionKeys);
      await smartAccount.enableFeature(Feature.BatchTransactions);
      await smartAccount.enableFeature(Feature.GasTokenPayment);
      
      // Update the deployed contract address
      DEPLOYED_CONTRACTS.smartAccount = smartAccountAddress;
    }
    
    // Save the address
    smartAccounts[signerAddress] = smartAccountAddress;
    
    return smartAccountAddress;

  } catch (error) {
    // console.error('[smartAccount] Error creating smart account:', error);
    throw error;
  }
}

/**
 * Build an EIP-7702 transaction (Pectra format)
 * @param {Object} txParams - Base transaction parameters
 * @param {string} gasToken - Address of token used for gas payment (optional)
 * @param {Array} batch - Array of transactions to batch (optional)
 * @returns {Object} - Formatted transaction object
 */
export function buildPectraTx(txParams, gasToken = null, batch = null) {
  // Start with base transaction
  const pectraTx = {
    ...txParams,
    type: 3 // EIP-7702 transaction type
  };
  
  // Add gas token if specified
  if (gasToken) {
    pectraTx.gasToken = gasToken;
  }
  
  // Add batch transactions if specified
  if (batch && Array.isArray(batch) && batch.length > 0) {
    pectraTx.batch = batch;
  }
  
  return pectraTx;
}

/**
 * Execute a swap transaction through a smart account
 * @param {ethers.Signer} signer - The signer (from MetaMask)
 * @param {string} fromToken - Address of token to swap from
 * @param {string} toToken - Address of token to swap to
 * @param {string} amount - Amount to swap (in smallest unit)
 * @param {boolean} useGasToken - Whether to pay gas in ERC-20
 * @returns {Promise<string>} - Transaction hash
 */
export async function executeSwap(signer, fromToken, toToken, amount, useGasToken = false) {
  try {
    // console.log('[smartAccount] executeSwap function called.');
    // console.log('[smartAccount] Args - Signer:', signer, 'From:', fromToken, 'To:', toToken, 'Amount:', amount.toString(), 'UseGasToken:', useGasToken);

    // Get network info first
    const provider = signer.provider;
    let network = { chainId: 1, name: 'unknown' }; // Default to Ethereum mainnet
    
    if (provider) {
      try {
        network = await provider.getNetwork();
        // console.log(`[smartAccount] Executing swap on network: ${network.name} (chainId: ${network.chainId})`);
      } catch (networkError) {
        // console.error('[smartAccount] Error getting network from provider during swap:', networkError);
      }
    }
    
    // SIMULATION_MODE block removed, proceeding directly with real swap logic
    
    // Get the current chain ID
    const chainId = network.chainId.toString();
    
    // Get the SimpleSwap contract address for this network
    let simpleSwapAddress;
    if (chainId === '31337') {
      // Local Hardhat network
      simpleSwapAddress = DEPLOYED_CONTRACTS.simpleSwap['31337'];
    } else {
      simpleSwapAddress = DEPLOYED_CONTRACTS.simpleSwap[chainId];
    }
    
    if (!simpleSwapAddress) {
      throw new Error(`[smartAccount] No SimpleSwap contract deployed on network ${chainId}. DEPLOYED_CONTRACTS: ${JSON.stringify(DEPLOYED_CONTRACTS.simpleSwap)}`);
    }
    
    // console.log(`[smartAccount] Using SimpleSwap address for chainId ${chainId}: ${simpleSwapAddress}`);
    
    // Connect to the SimpleSwap contract
    const simpleSwap = new ethers.Contract(simpleSwapAddress, SimpleSwapABI, signer);
    
    // Choose the appropriate USDC address for this network
    let usdcAddress;
    if (chainId === '59144') {
      usdcAddress = TokenAddresses.USDC_LINEA;
    } else if (chainId === '59140') {
      usdcAddress = TokenAddresses.USDC_LINEA_TESTNET;
    } else if (chainId === '1') {
      usdcAddress = TokenAddresses.USDC_ETHEREUM;
    } else if (chainId === '31337') {
      // Local Hardhat network - use testnet USDC address for testing
      usdcAddress = TokenAddresses.USDC_LINEA_TESTNET;
      // console.log(`[smartAccount] Local Hardhat (31337): Using MockUSDC (USDC_LINEA_TESTNET) address: ${usdcAddress}`);
    } else {
      throw new Error(`[smartAccount] Unsupported network for USDC address: ${chainId}`);
    }
    
    let tx;
    
    // Execute the swap based on direction
    if (fromToken === ethers.constants.AddressZero) {
      // ETH to USDC swap
      // console.log(`[smartAccount] ETH to USDC swap. Amount (wei): ${amount.toString()}`);
      tx = await simpleSwap.swapEthToUsdc({ value: amount });
    } else {
      // USDC to ETH swap
      // console.log(`[smartAccount] USDC to ETH swap. Amount (smallest unit): ${amount.toString()}, USDC Address: ${usdcAddress}`);
      const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
      
      // Check current allowance
      const userAddress = await signer.getAddress();
      const currentAllowance = await usdc.allowance(userAddress, simpleSwapAddress);
      // console.log(`[smartAccount] Current USDC allowance for SimpleSwap: ${currentAllowance.toString()}`);
      
      if (currentAllowance.lt(amount)) {
        // console.log('[smartAccount] Approving SimpleSwap to spend USDC...');
        const approveTx = await usdc.approve(simpleSwapAddress, amount);
        await approveTx.wait();
        // console.log('[smartAccount] USDC approved. Tx:', approveTx.hash);
      } else {
        // console.log('[smartAccount] Sufficient USDC allowance already present.');
      }
      
      // Execute the swap
      // console.log('[smartAccount] Executing SimpleSwap.swapUsdcToEth...');
      tx = await simpleSwap.swapUsdcToEth(amount);
    }
    
    // Wait for the transaction to complete
    // console.log(`[smartAccount] Swap transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    // console.log('[smartAccount] Swap transaction confirmed. Receipt:', receipt);
    
    return tx.hash;
  } catch (error) {
    // console.error('[smartAccount] Error executing swap:', error);
    throw error;
  }
}

/**
 * Execute a batch of transactions through a smart account
 * @param {ethers.Signer} signer - The signer (from MetaMask)
 * @param {Array} transactions - Array of transaction objects
 * @param {boolean} useGasToken - Whether to pay gas in ERC-20
 * @returns {Promise<string>} - Transaction hash
 */
export async function executeBatchTransactions(signer, transactions, useGasToken = false) {
  try {
    // console.log('[smartAccount] executeBatchTransactions called. Transactions:', transactions, 'UseGasToken:', useGasToken);
    // Get or create smart account
    const smartAccountAddress = await createSmartAccount(signer);
    
    // Determine if we should use ERC-20 for gas
    const gasTokenAddress = useGasToken ? TokenAddresses.USDC_ETHEREUM : null;
    
    // Build the Pectra transaction with batch
    const pectraTx = buildPectraTx({
      to: smartAccountAddress,
      data: '0x', // This would be the batch execution function selector
      value: '0'
    }, gasTokenAddress, transactions);
    
    // Send transaction
    const tx = await signer.sendTransaction(pectraTx);
    // console.log(`[smartAccount] Batch transaction sent: ${tx.hash}`);
    
    // Wait for transaction to complete
    const receipt = await tx.wait();
    // console.log('[smartAccount] Batch transaction confirmed. Receipt:', receipt);
    
    return tx.hash;
  } catch (error) {
    // console.error('[smartAccount] Error executing batch transactions:', error);
    throw error;
  }
} 