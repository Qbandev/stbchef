const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// Map of network names to chain IDs
const NETWORK_CHAIN_IDS = {
  'linea': '59144',
  'lineamainnet': '59144',
  'lineatestnet': '59140',
  'goerli': '59140',
  'hardhat': '31337',
  'localhost': '31337'
};

// Main function
async function main() {
  try {
    console.log('Extracting contract addresses from deployment log...');
    
    // Check if deployment.log exists
    if (!fs.existsSync('deployment.log')) {
      console.error('Error: deployment.log not found');
      console.log('Please run deployment first: npm run deploy | tee deployment.log');
      process.exit(1);
    }
    
    // Read the deployment log
    const logContent = fs.readFileSync('deployment.log', 'utf8');
    
    // Extract SmartAccount address
    const smartAccountMatch = logContent.match(/SmartAccount\s*(?:deployed to|:)\s*([0-9a-fA-Fx]+)/);
    const smartAccountAddress = smartAccountMatch ? smartAccountMatch[1] : "";
    
    // Extract SimpleSwap address
    const simpleSwapMatch = logContent.match(/SimpleSwap\s*(?:deployed to|:)\s*([0-9a-fA-Fx]+)/);
    const simpleSwapAddress = simpleSwapMatch ? simpleSwapMatch[1] : "";
    
    // Determine the network that was used for deployment
    let network = 'unknown';
    let chainId = '59140'; // Default to Linea Testnet
    
    // Try different regex patterns to match network info
    const networkPatterns = [
      /Deploying to network: ([a-zA-Z0-9]+) \(chainId: (\d+)\)/,
      /network: ([a-zA-Z0-9]+) \(chainId: (\d+)\)/,
      /network:\s*([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of networkPatterns) {
      const match = logContent.match(pattern);
      if (match) {
        network = match[1].toLowerCase();
        chainId = match[2] || NETWORK_CHAIN_IDS[network] || '59140';
        break;
      }
    }
    
    // If we still don't have a chainId but have a network name, try to map it
    if (chainId === '59140' && network !== 'unknown') {
      chainId = NETWORK_CHAIN_IDS[network] || '59140';
    }
    
    console.log('Extracted addresses:');
    console.log(`Network: ${network} (ChainID: ${chainId})`);
    console.log(`SmartAccount: ${smartAccountAddress}`);
    console.log(`SimpleSwap: ${simpleSwapAddress}`);
    
    // Run the update-contract-addresses script with the extracted addresses
    if (simpleSwapAddress) {
      let updateCmd = `node scripts/update-contract-addresses.js ${simpleSwapAddress} ${chainId}`;
      
      // If this is a local network, also pass the SmartAccount address
      if (chainId === '31337' && smartAccountAddress) {
        updateCmd += ` ${smartAccountAddress}`;
      }
      
      console.log(`Running: ${updateCmd}`);
      childProcess.execSync(updateCmd, { stdio: 'inherit' });
      console.log('Contract addresses updated successfully!');
    } else {
      console.error('Error: Failed to extract SimpleSwap address');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error extracting addresses:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(error);
  process.exit(1);
}); 