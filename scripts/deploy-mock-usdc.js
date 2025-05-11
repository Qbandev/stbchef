const hre = require("hardhat");

async function main() {
  console.log("Deploying MockUSDC contract...");
  
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  
  await mockUSDC.deployed();
  
  console.log("MockUSDC deployed to:", mockUSDC.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
