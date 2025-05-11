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
  
  // --------------------------------------------------------------
  // Determine which USDC address to use.  If we are on Hardhat
  // local network (chainId 31337) we will deploy a MockUSDC token
  // on-the-fly so that SimpleSwap has a real ERC20 to work with.
  // --------------------------------------------------------------

  let usdcAddress;

  if (network.chainId === 31337) {
    console.log("Local Hardhat network detected – deploying MockUSDC…");

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.deployed();

    console.log(`MockUSDC deployed to: ${mockUSDC.address}`);
    usdcAddress = mockUSDC.address;
  } else {
    // 59144 = Linea mainnet, otherwise default to Linea testnet constants
    usdcAddress = network.chainId === 59144 ? USDC_ADDRESS.mainnet : USDC_ADDRESS.testnet;
  }
  
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

  // If SimpleSwap exposes a setter for USDC address (older versions),
  // update it so front-end code works regardless of constructor param.
  if (typeof simpleSwap.setUsdcAddress === 'function') {
    try {
      const txSet = await simpleSwap.setUsdcAddress(usdcAddress);
      await txSet.wait();
      console.log(`SimpleSwap#setUsdcAddress called – now points to ${usdcAddress}`);
    } catch (err) {
      console.log("setUsdcAddress() call failed or is not allowed – continuing.");
    }
  }

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