const fs = require('fs');
const path = require('path');

const addressesFilePath = path.join(__dirname, '..', 'artifacts', 'deployed_addresses.json');
const smartAccountJsPath = path.join(__dirname, '..', 'src', 'web', 'static', 'js', 'smartAccount.js');

function updateAddresses() {
  if (!fs.existsSync(addressesFilePath)) {
    console.error(`Error: Deployment addresses file not found at ${addressesFilePath}`);
    console.error("Please run the deployment script first (e.g., 'npm run deploy:local').");
    process.exit(1);
  }

  if (!fs.existsSync(smartAccountJsPath)) {
    console.error(`Error: smartAccount.js not found at ${smartAccountJsPath}`);
    process.exit(1);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(addressesFilePath, 'utf8'));
  let smartAccountJsContent = fs.readFileSync(smartAccountJsPath, 'utf8');

  console.log("Updating frontend contract addresses...");

  // Update DEPLOYED_CONTRACTS.smartAccount
  const saRegex = /(export const DEPLOYED_CONTRACTS\s*=\s*{\s*"smartAccount":\s*")([^"]*)(")/m;
  if (deployedAddresses.smartAccount) {
    smartAccountJsContent = smartAccountJsContent.replace(saRegex, `$1${deployedAddresses.smartAccount}$3`);
    console.log(`  Updated SmartAccount address to: ${deployedAddresses.smartAccount}`);
  }

  // Update DEPLOYED_CONTRACTS.simpleSwap for the specific chainId
  if (deployedAddresses.simpleSwap && deployedAddresses.chainId) {
    const ssChainIdRegex = new RegExp(`(export const DEPLOYED_CONTRACTS[\s\S]*?"simpleSwap":\s*{[\s\S]*?"${deployedAddresses.chainId}":\s*")([^"]*)(")`, 'm');
    if (smartAccountJsContent.match(ssChainIdRegex)){
        smartAccountJsContent = smartAccountJsContent.replace(ssChainIdRegex, `$1${deployedAddresses.simpleSwap}$3`);
        console.log(`  Updated SimpleSwap for chainId ${deployedAddresses.chainId} to: ${deployedAddresses.simpleSwap}`);
    } else {
        console.warn(`  Could not find simpleSwap entry for chainId ${deployedAddresses.chainId} to update.`);
    }
  }

  // Update TokenAddresses.USDC_LINEA_TESTNET if mockUSDC is present (for localhost/31337)
  if (deployedAddresses.mockUSDC && deployedAddresses.chainId === 31337) {
    const usdcRegex = /(export const TokenAddresses\s*=\s*{[\s\S]*?USDC_LINEA_TESTNET:\s*')([^']*)(')/m;
    smartAccountJsContent = smartAccountJsContent.replace(usdcRegex, `$1${deployedAddresses.mockUSDC}$3`);
    console.log(`  Updated USDC_LINEA_TESTNET (MockUSDC) to: ${deployedAddresses.mockUSDC}`);
  }

  fs.writeFileSync(smartAccountJsPath, smartAccountJsContent, 'utf8');
  console.log(`Successfully updated ${smartAccountJsPath}`);
}

updateAddresses(); 