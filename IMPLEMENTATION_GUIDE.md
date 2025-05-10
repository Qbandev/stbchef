# Implementation Guide: Moving from POC to MVP

This guide outlines the implementation of the Simple Crypto Trading Bot Chef as a minimum viable product with actual trading capabilities using Ethereum Pectra features.

## Current Deployment Status

As of the latest update, the project is in local testing phase with the following status:

- **Local Hardhat Network**: Running at http://127.0.0.1:8545/
- **Deployed Contracts**:
  - SmartAccount: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
  - SimpleSwap: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- **Known Issues**:
  1. Flask/Werkzeug version mismatch causing startup errors
  2. Missing OpenZeppelin contracts dependency
  3. Swap transactions failing with "External transactions to internal accounts cannot include data" error

## Issues and Solutions

### 1. Flask/Werkzeug Version Mismatch
The application is failing to start due to a mismatch between Flask and Werkzeug versions:
```
ImportError: cannot import name 'url_quote' from 'werkzeug.urls'
```

**Solution**:
```bash
pip uninstall flask werkzeug
pip install flask==2.0.1 werkzeug==2.0.1
```

### 2. Missing OpenZeppelin Contracts
Attempting to deploy mock USDC contracts fails with:
```
Error HH411: The library @openzeppelin/contracts, imported from contracts/mocks/MockUSDC.sol, is not installed.
```

**Solution**:
```bash
npm install --save-dev @openzeppelin/contracts
```

### 3. Swap Execution Failure
When attempting to execute swaps on local network, receiving MetaMask error:
```
MetaMask - RPC Error: External transactions to internal accounts cannot include data
```

**Solution**: This error occurs because the local SimpleSwap contract is trying to interact with a USDC token contract that doesn't exist. Two options:

**Option A - Mock USDC Contract**: 
1. Install OpenZeppelin contracts: `npm install --save-dev @openzeppelin/contracts`
2. Create and deploy a MockUSDC contract
3. Update SimpleSwap to use the MockUSDC address

**Option B - SimpleSwap Configuration**:
1. Update the SmartAccount.js TokenAddresses to use Account #1 as fake USDC:
   ```javascript
   // In src/web/static/js/smartAccount.js
   const TokenAddresses = {
     // other addresses...
     USDC_LINEA_TESTNET: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" // Account #1
   };
   ```
2. If SimpleSwap has a `setUsdcAddress` function, call it to use Account #1

## Components Implemented

1. **Smart Account Contract (contracts/SmartAccount.sol)**
   - EIP-7702 compatible smart account
   - Session key management
   - Batch transaction support
   - Gas token payment

2. **SimpleSwap Contract (contracts/SimpleSwap.sol)**
   - ETH to USDC swaps
   - USDC to ETH swaps
   - Price oracle simulation

3. **JavaScript Integration**
   - Smart account creation (src/web/static/js/smartAccount.js)
   - Swap execution (src/web/static/js/swapManager.js)
   - Transaction confirmation UI

## Next Steps for Deployment

### 1. Fix Local Testing Environment

```bash
# Fix Flask version issues
pip uninstall flask werkzeug
pip install flask==2.0.1 werkzeug==2.0.1

# Install missing dependencies
npm install --save-dev @openzeppelin/contracts

# Deploy MockUSDC contract 
# (Create contracts/mocks/MockUSDC.sol first with proper ERC20 implementation)
npx hardhat run scripts/deploy-mock-usdc.js --network localhost

# OR update TokenAddresses in smartAccount.js to use Account #1 as fake USDC
# TokenAddresses.USDC_LINEA_TESTNET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
```

### 2. Complete Testnet Deployment

After successful local testing:

```bash
# Add private key to .env file
# PRIVATE_KEY=your_private_key_without_quotes

# Deploy to Linea Testnet
npm run deploy

# Update contract addresses
npm run update-addresses <DEPLOYED_CONTRACT_ADDRESS>
```

### 3. Test on Testnet

- Connect MetaMask to Linea Testnet
- Test ETH to USDC and USDC to ETH swaps
- Verify all functionality works as expected

### 4. Deploy to Mainnet

Only after thorough testing on Testnet:

```bash
# Deploy to Linea Mainnet
npx hardhat run scripts/deploy.js --network lineaMainnet

# Update contract addresses
npm run update-addresses <DEPLOYED_CONTRACT_ADDRESS>
```

## Deployment Steps

Follow these steps to deploy the contracts and run the application:

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment

Create a `.env` file with the following content. Each section below is required for proper functionality:

```
# Private Keys (NO QUOTES AROUND VALUES)
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE  # Your wallet's private key for contract deployment

# RPC URLs (NO QUOTES AROUND VALUES)
LINEA_RPC_URL=https://rpc.linea.build  # Linea Mainnet RPC URL
LINEA_TESTNET_RPC_URL=https://rpc.goerli.linea.build  # Linea Testnet RPC URL

# API Keys (NO QUOTES AROUND VALUES)
LINEASCAN_API_KEY=YOUR_LINEASCAN_API_KEY  # For contract verification on Lineascan
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY  # For contract verification on Etherscan

# Network Configuration
CHAIN_ID=59144  # Linea Mainnet Chain ID
TESTNET_CHAIN_ID=59140  # Linea Testnet Chain ID

# Additional Optional API Keys (for AI features)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GROQ_API_KEY=YOUR_GROQ_API_KEY
MISTRAL_API_KEY=YOUR_MISTRAL_API_KEY
```

#### Important Environment Variables:

1. **PRIVATE_KEY**:
   - Export your private key from MetaMask or other wallet (Settings > Security & Privacy > Export Private Key)
   - WARNING: Never share your private key or commit it to a repository
   - Make sure this wallet has funds for contract deployment gas fees

2. **RPC URLs**:
   - LINEA_RPC_URL: Default is https://rpc.linea.build for Linea Mainnet
   - LINEA_TESTNET_RPC_URL: Default is https://rpc.goerli.linea.build for Linea Testnet
   - To improve reliability, consider using private RPC providers like Infura, Alchemy, or QuickNode

3. **API Keys**:
   - LINEASCAN_API_KEY: Get from https://lineascan.build/myapikey
   - ETHERSCAN_API_KEY: Get from https://etherscan.io/myapikey

### 3. Compile Contracts

```bash
npm run compile
```

This will compile the SmartAccount.sol and SimpleSwap.sol contracts.

### 4. Deploy Contracts to Linea Testnet

```bash
npm run deploy
```

This will:
1. Deploy the SmartAccount contract
2. Enable all features (SessionKeys, BatchTransactions, GasTokenPayment)
3. Deploy the SimpleSwap contract with initial ETH price
4. Output the contract addresses

To deploy to local Hardhat network for testing:
```bash
npm run node
```

In another terminal:
```bash
npm run deploy:local
```

### 5. Update Contract Addresses

After deployment, update the contract addresses in your application:

```bash
npm run update-addresses CONTRACT_ADDRESS
```

Replace `CONTRACT_ADDRESS` with the SimpleSwap contract address from the deployment output.

Alternatively, you can extract addresses from deployment logs and update them automatically:

```bash
npm run deploy | tee deployment.log && node scripts/extract-addresses.js
```

#### Contract Addresses Configuration:

1. **Manual Update Method:**
   - Open `src/web/static/js/smartAccount.js`
   - Locate the `DEPLOYED_CONTRACTS` object (around line 7-20)
   - Update with your deployed contract addresses:

```javascript
const DEPLOYED_CONTRACTS = {
  smartAccount: "YOUR_SMART_ACCOUNT_ADDRESS",
  simpleSwap: {
    // Linea Mainnet
    "59144": "YOUR_LINEA_MAINNET_ADDRESS",
    // Linea Goerli Testnet 
    "59140": "YOUR_LINEA_TESTNET_ADDRESS",
    // Local Hardhat Network
    "31337": "YOUR_LOCAL_ADDRESS"
  }
};
```

2. **Network-Specific Deployments:**
   - For Linea Mainnet deployment:
     ```bash
     npx hardhat run scripts/deploy.js --network lineaMainnet
     ```
   - For Linea Testnet deployment:
     ```bash
     npx hardhat run scripts/deploy.js --network lineaTestnet
     ```
   - For local testing:
     ```bash
     npx hardhat run scripts/deploy.js --network localhost
     ```

3. **Verifying Addresses:**
   - After deployment, verify your contracts are working by checking the network-specific block explorer:
     - Linea Mainnet: https://lineascan.build/address/YOUR_CONTRACT_ADDRESS
     - Linea Testnet: https://goerli.lineascan.build/address/YOUR_CONTRACT_ADDRESS

4. **Contract Verification:**
   - Verify your contracts on Lineascan to enable public interaction with your contract:
     ```bash
     npx hardhat verify --network lineaMainnet YOUR_CONTRACT_ADDRESS constructor_arg1 constructor_arg2
     ```
   - For SimpleSwap, your args would be: USDC_ADDRESS and initialEthPrice

### 6. Run the Application

```bash
npm run start
```

This will start the Flask server at http://localhost:8080.

## Using the Application

1. **Connect Wallet**
   - Click "Connect Wallet" to connect your MetaMask to the application
   - Make sure you're on the Linea network or Linea Testnet

2. **Check Contract Status**
   - The application will check if the SmartAccount contract exists
   - If not, it will deploy one for your wallet address

3. **Execute Swaps**
   - You can perform ETH to USDC swaps or USDC to ETH swaps
   - The swap will be executed using the SimpleSwap contract
   - For USDC to ETH swaps, you need to approve the contract to spend your USDC first

4. **View Transaction History**
   - After executing swaps, you can view your transaction history in the Recent Transactions section

## Contract Details

### SmartAccount Contract

The SmartAccount contract implements:

- **Session Key Management**: Create temporary keys with expiry timestamps
- **Batch Transactions**: Execute multiple transactions in a single call
- **Gas Token Payment**: Pay for transactions using ERC-20 tokens instead of ETH

### SimpleSwap Contract

The SimpleSwap contract implements:

- **ETH to USDC Swaps**: Exchange ETH for USDC at the current price
- **USDC to ETH Swaps**: Exchange USDC for ETH at the current price
- **Price Oracle**: Simulates a price oracle by storing and updating ETH price

## Error Handling

Common issues and solutions:

1. **Network Mismatch**
   - Error: "Unsupported network"
   - Solution: Switch to Linea Mainnet, Testnet, or Local Hardhat Network in MetaMask

2. **Insufficient Balance**
   - Error: "Transfer failed" or "ETH transfer failed"
   - Solution: Make sure you have enough ETH or USDC for the swap

3. **Contract Deployment Failed**
   - Error: "Error creating smart account"
   - Solution: Check your wallet has enough ETH for gas fees

4. **USDC Approval Failed**
   - Error: "USDC transfer failed"
   - Solution: Make sure you approved the SimpleSwap contract to spend your USDC
   
5. **External Transactions Error**
   - Error: "External transactions to internal accounts cannot include data"
   - Solution: Ensure you're interacting with proper contract addresses, not regular accounts.
   For local testing, deploy a MockUSDC contract or update the TokenAddresses to use Account #1

## API Key Requirements

For full functionality, the following API keys are required:

1. **LINEASCAN_API_KEY**
   - Purpose: Contract verification on the Linea block explorer
   - How to obtain: Register at https://lineascan.build/myapikey
   - Required for: Verifying the deployed contracts on Linea Mainnet/Testnet

2. **ETHERSCAN_API_KEY**
   - Purpose: Contract verification when testing on Ethereum networks
   - How to obtain: Register at https://etherscan.io/myapikey
   - Required for: Verifying contracts on Ethereum Mainnet/Testnet

3. **AI Model API Keys** (Optional for AI trading recommendations)
   - GEMINI_API_KEY: For Google's Gemini AI model
   - GROQ_API_KEY: For Groq's AI platform
   - MISTRAL_API_KEY: For Mistral AI's models
   - These keys enable the AI trading recommendation features

## Production Deployment Checklist

To deploy the application to production, follow these steps:

1. **Security Audit**
   - Review smart contracts for security vulnerabilities
   - Check for proper access controls and input validation
   - Ensure secure key management practices

2. **Contract Testing**
   - Thoroughly test all contracts on Linea Testnet
   - Verify all functions work as expected with real tokens
   - Test edge cases and error handling

3. **Mainnet Deployment**
   - Deploy to Linea Mainnet using:
     ```bash
     npx hardhat run scripts/deploy.js --network lineaMainnet
     ```
   - Verify contracts on Lineascan after deployment
   - Update contract addresses in application configuration

4. **Frontend Configuration**
   - Update `src/web/static/js/smartAccount.js` with Mainnet addresses
   - Ensure proper network detection and switching
   - Test the frontend with Mainnet contracts

5. **Monitoring and Maintenance**
   - Set up monitoring for contract interactions
   - Implement alerts for failed transactions
   - Plan for potential contract upgrades

6. **User Documentation**
   - Create a user guide for the application
   - Document known limitations and risks
   - Provide troubleshooting steps for common issues

## Testing

You can test the contracts locally using Hardhat:

```bash
# In one terminal
npm run node

# In another terminal
npm run deploy:local

# Install missing dependencies if needed
npm install --save-dev @openzeppelin/contracts

# Fix Flask issues
pip uninstall flask werkzeug
pip install flask==2.0.1 werkzeug==2.0.1

# Start the application
npm run start
```

## Local Testing Accounts

When testing locally, you can use these Hardhat accounts:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

For testing, use Account #1 as the "fake" USDC address in your local environment.

## Resources

- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [MetaMask SDK Documentation](https://docs.metamask.io/guide/ethereum-provider.html)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [Linea Documentation](https://docs.linea.build/) 

## Implementation Completion Checklist

Use this checklist to ensure you've completed all the necessary steps for full production deployment:

- [ ] Environment Configuration
  - [ ] Created `.env` file with all required variables
  - [ ] Added private key for contract deployment
  - [ ] Configured RPC URLs for all networks
  - [ ] Added API keys for contract verification

- [ ] Contract Deployment
  - [ ] Successfully compiled contracts with `npm run compile`
  - [ ] Deployed to testnet with `npm run deploy`
  - [ ] Verified contract on Lineascan
  - [ ] Tested all contract functionality on testnet
  - [ ] Deployed to mainnet with proper configuration

- [ ] Address Configuration
  - [ ] Updated SimpleSwap addresses in code
  - [ ] Updated SmartAccount address in code
  - [ ] Verified address configuration works on all networks

- [ ] Application Testing
  - [ ] Tested wallet connection
  - [ ] Tested ETH to USDC swaps
  - [ ] Tested USDC to ETH swaps
  - [ ] Tested transaction error handling
  - [ ] Verified transaction history display

- [ ] Production Readiness
  - [ ] Conducted security review
  - [ ] Implemented monitoring solution
  - [ ] Created user documentation
  - [ ] Set up proper error logging
  - [ ] Tested with real funds (small amounts)

Once all items are checked, your implementation is ready for production use! 