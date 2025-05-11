const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartAccount gas token & batch", function () {
  let deployer, user;
  let smartAccount;
  let mockUSDC;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();

    const SmartAccount = await ethers.getContractFactory("SmartAccount");
    smartAccount = await SmartAccount.deploy();
    await smartAccount.deployed();

    // enable features
    await smartAccount.enableFeature(0); // SessionKeys (not used)
    await smartAccount.enableFeature(1); // BatchTransactions
    await smartAccount.enableFeature(2); // GasTokenPayment

    // Deploy MockUSDC and mint to user for gas payments
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.deployed();

    // transfer 1000 USDC to user
    const usdcFund = ethers.utils.parseUnits("1000", 6);
    await mockUSDC.transfer(user.address, usdcFund);

    // Fund smartAccount with USDC to cover gas payments
    await mockUSDC.transfer(smartAccount.address, ethers.utils.parseUnits("100", 6));

    // Authorize user via session key (valid 1 hour)
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    await smartAccount.addSessionKey(user.address, expiry);
  });

  it("pays gas in USDC via executeWithGasToken", async function () {
    const gasPayment = ethers.utils.parseUnits("10", 6); // 10 USDC

    // user approves smartAccount to spend USDC (simulate via transferFrom inside call)
    await mockUSDC.connect(user).approve(smartAccount.address, gasPayment);

    // Prepare a dummy call: updateEthPrice on a new SimpleSwap so we have something
    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const initialPrice = ethers.utils.parseUnits("2000", 6);
    const simpleSwap = await SimpleSwap.deploy(mockUSDC.address, initialPrice);
    await simpleSwap.deployed();

    const newPrice = ethers.utils.parseUnits("2100", 6);
    const calldata = simpleSwap.interface.encodeFunctionData("updateEthPrice", [newPrice]);

    // executeWithGasToken by user
    await smartAccount.connect(user).executeWithGasToken(
      mockUSDC.address,
      gasPayment,
      simpleSwap.address,
      0,
      calldata
    );

    expect(await simpleSwap.ethPrice()).to.equal(newPrice);
  });

  it("executes batch successfully", async function () {
    // Deploy dummy SimpleSwap and a second one
    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const initP = ethers.utils.parseUnits("2000", 6);
    const s1 = await SimpleSwap.deploy(mockUSDC.address, initP);
    await s1.deployed();
    const s2 = await SimpleSwap.deploy(mockUSDC.address, initP);
    await s2.deployed();

    const p1 = ethers.utils.parseUnits("2100", 6);
    const p2 = ethers.utils.parseUnits("1900", 6);

    const data1 = s1.interface.encodeFunctionData("updateEthPrice", [p1]);
    const data2 = s2.interface.encodeFunctionData("updateEthPrice", [p2]);

    const targets = [s1.address, s2.address];
    const values = [0, 0];
    const datas = [data1, data2];

    await smartAccount.connect(user).executeBatch(targets, values, datas);

    expect(await s1.ethPrice()).to.equal(p1);
    expect(await s2.ethPrice()).to.equal(p2);
  });
}); 