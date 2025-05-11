const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleSwap end-to-end", function () {
  let deployer;
  let user;
  let mockUSDC;
  let simpleSwap;

  const INITIAL_PRICE_USDC = "2000.0"; // 1 ETH = 2000 USDC

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();

    // Deploy MockUSDC with 6-decimals (1M minted to deployer by default)
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.deployed();

    // Deploy SimpleSwap
    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const initialPrice = ethers.utils.parseUnits(INITIAL_PRICE_USDC, 6);
    simpleSwap = await SimpleSwap.deploy(mockUSDC.address, initialPrice);
    await simpleSwap.deployed();

    // Fund SimpleSwap with USDC so it can pay out for ETH→USDC swaps
    const usdcLiquidity = ethers.utils.parseUnits("100000", 6); // 100k USDC
    await mockUSDC.transfer(simpleSwap.address, usdcLiquidity);
  });

  it("quote functions work", async function () {
    const oneEthWei = ethers.utils.parseEther("1");
    const quoteUSDC = await simpleSwap.getQuoteEthToUsdc(oneEthWei);
    expect(quoteUSDC).to.equal(ethers.utils.parseUnits("1990", 6));

    const quoteETH = await simpleSwap.getQuoteUsdcToEth(quoteUSDC);
    // Expect double slippage: 1 ETH * 0.995 * 0.995 = 0.990025 ETH
    expect(quoteETH).to.equal(ethers.utils.parseEther("0.990025"));
  });

  it("swaps ETH → USDC successfully", async function () {
    const oneEthWei = ethers.utils.parseEther("1");
    const expectedUSDC = ethers.utils.parseUnits("1990", 6);

    const tx = await simpleSwap.connect(user).swapEthToUsdc({ value: oneEthWei });
    await tx.wait();

    const userUsdcBal = await mockUSDC.balanceOf(user.address);
    expect(userUsdcBal).to.equal(expectedUSDC);
  });

  it("swaps USDC → ETH successfully", async function () {
    // First, give user some USDC
    const amountUsdc = ethers.utils.parseUnits("5000", 6); // 5k USDC
    await mockUSDC.transfer(user.address, amountUsdc);

    // User approves SimpleSwap
    await mockUSDC.connect(user).approve(simpleSwap.address, amountUsdc);

    // Ensure SimpleSwap has some ETH liquidity (send 3 ETH from deployer)
    await deployer.sendTransaction({ to: simpleSwap.address, value: ethers.utils.parseEther("3") });

    // Perform swap
    const tx = await simpleSwap.connect(user).swapUsdcToEth(amountUsdc);
    const receipt = await tx.wait();

    // Expect event emitted & ETH received roughly 2.5 ETH at current price (5000/2000)
    const expectedEth = ethers.utils.parseEther("2.4875"); // 2.5 * 0.995
    const userEthAfter = await ethers.provider.getBalance(user.address);

    // ensure received ETH >= expectedEth minus gas; allow small delta
    expect(userEthAfter.sub(expectedEth).gte(0)).to.be.true;
  });
}); 