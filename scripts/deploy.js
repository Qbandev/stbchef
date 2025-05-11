const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

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
  let mockUSDCInstance; // Declare mockUSDCInstance here to be accessible later

  if (network.chainId === 31337) {
    console.log("Local Hardhat network detected – deploying MockUSDC…");

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDCInstance = await MockUSDCFactory.deploy(); // Assign to the outer scope variable
    await mockUSDCInstance.deployed();

    console.log(`MockUSDC deployed to: ${mockUSDCInstance.address}`);
    usdcAddress = mockUSDCInstance.address;
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

  // If on local Hardhat network, fund SimpleSwap with some MockUSDC
  if (network.chainId === 31337 && mockUSDCInstance) { // Check mockUSDCInstance now
    const initialLiquidity = ethers.utils.parseUnits("1000000.0", 6); // e.g., 1 Million MockUSDC
    console.log(`Funding SimpleSwap contract (${simpleSwap.address}) with ${ethers.utils.formatUnits(initialLiquidity, 6)} MockUSDC...`);
    const transferTx = await mockUSDCInstance.connect(deployer).transfer(simpleSwap.address, initialLiquidity);
    await transferTx.wait();
    console.log(`SimpleSwap funded with MockUSDC. Transaction: ${transferTx.hash}`);
    
    // Verify SimpleSwap MockUSDC balance
    const simpleSwapUsdcBalance = await mockUSDCInstance.balanceOf(simpleSwap.address);
    console.log(`SimpleSwap contract MockUSDC balance: ${ethers.utils.formatUnits(simpleSwapUsdcBalance, 6)}`);
  }

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

  // Write addresses to a JSON file for frontend consumption
  const addresses = {
    networkName: network.name,
    chainId: network.chainId,
    smartAccount: smartAccount.address,
    simpleSwap: simpleSwap.address,
    // Only include mockUSDC if it was deployed (i.e., on localhost)
    ...(network.chainId === 31337 && { mockUSDC: usdcAddress })
  };

  const artifactsDir = path.join(__dirname, "..", "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(artifactsDir, "deployed_addresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nDeployed addresses written to artifacts/deployed_addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 