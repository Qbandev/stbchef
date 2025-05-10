const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Define the Linea USDC address
  const USDC_ADDRESS = {
    mainnet: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", // Linea mainnet USDC
    testnet: "0xf56dc6695cF1f5c364eDEbC7Dc7077ac9B586068"  // Linea testnet USDC
  };
  
  // Get the current network
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name} (chainId: ${network.chainId})`);
  
  // Choose USDC address based on network
  const usdcAddress = network.chainId === 59144 
    ? USDC_ADDRESS.mainnet 
    : USDC_ADDRESS.testnet;
  
  console.log(`Using USDC address: ${usdcAddress}`);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  // Deploy the SmartAccount contract
  console.log("Deploying SmartAccount contract...");
  const SmartAccount = await ethers.getContractFactory("SmartAccount");
  const smartAccount = await SmartAccount.deploy();

  await smartAccount.deployed();
  console.log(`SmartAccount deployed to: ${smartAccount.address}`);
  
  // Enable features
  console.log("Enabling features...");
  
  // Enable SessionKeys
  let tx = await smartAccount.enableFeature(0);
  await tx.wait();
  console.log("SessionKeys feature enabled");
  
  // Enable BatchTransactions
  tx = await smartAccount.enableFeature(1);
  await tx.wait();
  console.log("BatchTransactions feature enabled");
  
  // Enable GasTokenPayment
  tx = await smartAccount.enableFeature(2);
  await tx.wait();
  console.log("GasTokenPayment feature enabled");
  
  console.log("All features enabled successfully!");
  
  // Deploy the SimpleSwap contract
  console.log("\nDeploying SimpleSwap contract...");
  
  // Current ETH price in USDC (with 6 decimals)
  const initialEthPrice = ethers.utils.parseUnits("2000.0", 6);
  console.log(`Initial ETH price: ${ethers.utils.formatUnits(initialEthPrice, 6)} USDC`);
  
  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  const simpleSwap = await SimpleSwap.deploy(usdcAddress, initialEthPrice);

  await simpleSwap.deployed();
  console.log(`SimpleSwap deployed to: ${simpleSwap.address}`);

  // Output contract addresses
  console.log("\n==================================================");
  console.log("Deployment Summary:");
  console.log(`SmartAccount: ${smartAccount.address}`);
  console.log(`SimpleSwap: ${simpleSwap.address}`);
  console.log(`USDC Address: ${usdcAddress}`);
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 