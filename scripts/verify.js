const { ethers } = require("hardhat");

/**
 * Verify deployed contracts on the active network using Hardhat's built-in
 * verify task.  Requires the following env vars:
 *   SMART_ACCOUNT_ADDRESS – address of deployed SmartAccount contract
 *   SIMPLE_SWAP_ADDRESS   – address of deployed SimpleSwap contract
 *   USDC_ADDRESS          – USDC token address used in constructor
 *
 * Example:
 *   SMART_ACCOUNT_ADDRESS=0xabc SIMPLE_SWAP_ADDRESS=0xdef USDC_ADDRESS=0x123 \
 *   npx hardhat run scripts/verify.js --network lineaMainnet
 */
async function main() {
  const network = await ethers.provider.getNetwork();
  console.log(`Verifying contracts on ${network.name} (chainId ${network.chainId})…`);

  const smartAccountAddress = process.env.SMART_ACCOUNT_ADDRESS;
  const simpleSwapAddress = process.env.SIMPLE_SWAP_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS;

  if (!smartAccountAddress || !simpleSwapAddress || !usdcAddress) {
    throw new Error(
      "Please set SMART_ACCOUNT_ADDRESS, SIMPLE_SWAP_ADDRESS, and USDC_ADDRESS env vars."
    );
  }

  // The SimpleSwap constructor also took an initial ETH price argument (6-decimals).
  // Assuming the same 2000 USDC initial price used in deploy.js – adjust if different.
  const initialEthPrice = ethers.utils.parseUnits("2000.0", 6);

  // SmartAccount has no constructor args
  await hre.run("verify:verify", {
    address: smartAccountAddress,
    constructorArguments: []
  });
  console.log("SmartAccount verified ✔︎");

  await hre.run("verify:verify", {
    address: simpleSwapAddress,
    constructorArguments: [usdcAddress, initialEthPrice]
  });
  console.log("SimpleSwap verified ✔︎");

  console.log("All contracts verified 🎉");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 