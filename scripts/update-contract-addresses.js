const fs = require('fs');
const path = require('path');

// Contract addresses from deployment
const CONTRACT_ADDRESSES = {
  // These will be filled in after deployment with the correct addresses
  smartAccount: "", // This will be created per user
  simpleSwap: {
    // Linea Mainnet
    "59144": "",
    // Linea Goerli Testnet 
    "59140": "",
    // Local Hardhat Network
    "31337": ""
  }
};

/**
 * Update contract addresses in the smartAccount.js file
 * @param {string} smartAccountPath - Path to smartAccount.js
 * @param {object} addresses - The contract addresses object
 */
function updateContractAddresses(smartAccountPath, addresses) {
  try {
    console.log('Updating contract addresses...');
    
    // Read the current file
    const fileContent = fs.readFileSync(smartAccountPath, 'utf8');
    
    // Regular expression to find the DEPLOYED_CONTRACTS object
    const regex = /const DEPLOYED_CONTRACTS = \{[\s\S]*?\};/m;
    
    // New DEPLOYED_CONTRACTS content
    const newDeployedContracts = `const DEPLOYED_CONTRACTS = ${JSON.stringify(addresses, null, 2)};`;
    
    // Replace the content
    const updatedContent = fileContent.replace(regex, newDeployedContracts);
    
    // Write the file
    fs.writeFileSync(smartAccountPath, updatedContent, 'utf8');
    
    console.log('Contract addresses updated successfully!');
    console.log('Updated addresses:');
    console.log(JSON.stringify(addresses, null, 2));
    
  } catch (error) {
    console.error('Error updating contract addresses:', error);
    process.exit(1);
  }
}

// Get the network name from chain ID
function getNetworkName(chainId) {
  switch (chainId) {
    case "59144":
      return "Linea Mainnet";
    case "59140":
      return "Linea Testnet";
    case "31337":
      return "Local Hardhat Network";
    default:
      return "Unknown Network";
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  // Check if we have contract addresses
  if (args.length >= 1) {
    const simpleSwapAddress = args[0];
    
    // Second argument is optional chain ID (default to testnet)
    const chainId = args.length >= 2 ? args[1] : "59140";
    
    // Set the address for the specified network
    CONTRACT_ADDRESSES.simpleSwap[chainId] = simpleSwapAddress;
    
    // If this is local network, also update the smart account
    if (chainId === "31337" && args.length >= 3) {
      CONTRACT_ADDRESSES.smartAccount = args[2]; // Smart account address for local network
    }
    
    console.log(`Updating ${getNetworkName(chainId)} contract address: ${simpleSwapAddress}`);
  } else {
    console.error('Error: No contract address provided');
    console.log('Usage: node scripts/update-contract-addresses.js <simpleSwapAddress> [chainId] [smartAccountAddress]');
    process.exit(1);
  }
  
  console.log('Contract addresses to use:');
  console.log(JSON.stringify(CONTRACT_ADDRESSES, null, 2));
  
  // Define the path to smartAccount.js
  const smartAccountPath = path.join(__dirname, '..', 'src', 'web', 'static', 'js', 'smartAccount.js');
  
  // Update the contract addresses
  updateContractAddresses(smartAccountPath, CONTRACT_ADDRESSES);
}

// Run the script
main().catch(error => {
  console.error(error);
  process.exit(1);
}); 