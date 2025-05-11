const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleSwap reverts", function () {
  let mockUSDC;
  let simpleSwap;
  let user;

  beforeEach(async () => {
    [, user] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.deployed();

    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const initialPrice = ethers.utils.parseUnits("2000", 6);
    simpleSwap = await SimpleSwap.deploy(mockUSDC.address, initialPrice);
    await simpleSwap.deployed();
  });

  it("reverts when swapping ETH→USDC with zero value", async function () {
    await expect(simpleSwap.connect(user).swapEthToUsdc({ value: 0 }))
      .to.be.revertedWith("Must send ETH");
  });

  it("reverts when swapping USDC→ETH without allowance", async function () {
    const amountUsdc = ethers.utils.parseUnits("100", 6);
    await mockUSDC.transfer(user.address, amountUsdc);

    await expect(simpleSwap.connect(user).swapUsdcToEth(amountUsdc))
      .to.be.reverted;
  });
}); 