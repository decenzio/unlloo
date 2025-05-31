import { expect } from "chai";
import { ethers } from "hardhat";
import { LoanMaster } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LoanMaster", function () {
  let loanMaster: LoanMaster;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let mockUSDC: any; // Will be implemented as ERC20 token

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20Factory.deploy("Mock USDC", "USDC");
    // mockWETH = await MockERC20Factory.deploy("Mock WETH", "WETH", 18);
    // mockWBTC = await MockERC20Factory.deploy("Mock WBTC", "WBTC", 8);

    // Deploy LoanMaster contract
    const LoanMasterFactory = await ethers.getContractFactory("LoanMaster");
    loanMaster = (await LoanMasterFactory.deploy()) as LoanMaster;

    // Initialize default pools for consistency across tests
    await loanMaster.createLiquidityPool(await mockUSDC.getAddress(), 500, 1000);
    // await loanMaster.createLiquidityPool(await mockWETH.getAddress(), 300, 800);
    // await loanMaster.createLiquidityPool(await mockWBTC.getAddress(), 400, 900);
  });

  describe("Deployment", function () {
    it("Should have 3 liquidity pools initialized on deploy", async function () {
      expect(await loanMaster.getLiquidityPoolCount()).to.equal(4);
    });

    it("Should have proper APR settings for each pool", async function () {
      const usdcPool = await loanMaster.getLiquidityPool(0);
      const wethPool = await loanMaster.getLiquidityPool(1);
      const wbtcPool = await loanMaster.getLiquidityPool(2);

      expect(usdcPool.depositAPR).to.equal(500);
      expect(usdcPool.borrowAPR).to.equal(1000);

      expect(wethPool.depositAPR).to.equal(300);
      expect(wethPool.borrowAPR).to.equal(800);

      expect(wbtcPool.depositAPR).to.equal(400);
      expect(wbtcPool.borrowAPR).to.equal(900);
    });
  });

  describe("Deposits and Withdrawals", function () {
    it("Should allow users to deposit tokens", async function () {
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDC

      // First approve the contract to spend tokens
      await mockUSDC.mint(await user.getAddress(), depositAmount);
      await mockUSDC.connect(user).approve(await loanMaster.getAddress(), depositAmount);

      // Make the deposit
      await loanMaster.connect(user).addLiquidity(3, depositAmount);

      // Check user's deposit was recorded
      expect(await loanMaster.getUserDeposit(3, await user.getAddress())).to.equal(depositAmount);

      // Check pool liquidity increased
      const pool = await loanMaster.getLiquidityPool(3);
      expect(pool.liquidity).to.equal(depositAmount);
    });

    it("Should allow users to withdraw tokens with interest", async function () {
      const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
      const user2 = (await ethers.getSigners())[2];

      // Mint tokens to both users
      await mockUSDC.mint(await user.getAddress(), depositAmount);
      await mockUSDC.mint(await user2.getAddress(), depositAmount);

      // Approve and deposit for both users
      await mockUSDC.connect(user).approve(await loanMaster.getAddress(), depositAmount);
      await mockUSDC.connect(user2).approve(await loanMaster.getAddress(), depositAmount);
      await loanMaster.connect(user).addLiquidity(3, depositAmount);
      await loanMaster.connect(user2).addLiquidity(3, depositAmount);

      // Fast forward time to accrue interest
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      // Check user1's balance before withdrawal
      const balanceBefore = await mockUSDC.balanceOf(await user.getAddress());

      // User1 withdraws liquidity
      await loanMaster.connect(user).removeLiquidity(3);

      // Verify user1's withdrawal
      const balanceAfter = await mockUSDC.balanceOf(await user.getAddress());
      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(await loanMaster.getUserDeposit(3, await user.getAddress())).to.equal(0);

      // Verify user2 still has their deposit
      expect(await loanMaster.getUserDeposit(3, await user2.getAddress())).to.equal(depositAmount);
    });
  });

  describe("Borrowing and Repaying", function () {
    it("Should allow users to borrow tokens", async function () {
      // First add liquidity to the pool
      const liquidityAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      await mockUSDC.mint(await owner.getAddress(), liquidityAmount);
      await mockUSDC.connect(owner).approve(await loanMaster.getAddress(), liquidityAmount);
      await loanMaster.connect(owner).addLiquidity(3, liquidityAmount);

      // Now borrow some tokens
      // Now borrow some tokens
      const borrowAmount = ethers.parseUnits("500", 6); // 500 USDC
      const balanceBefore = await mockUSDC.balanceOf(await user.getAddress());

      await loanMaster.connect(user).borrow(3, borrowAmount);

      const balanceAfter = await mockUSDC.balanceOf(await user.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(borrowAmount);

      // Check borrow was recorded
      expect(await loanMaster.getUserBorrow(3, await user.getAddress())).to.equal(borrowAmount);
    });

    it("Should allow users to repay borrowed tokens with interest", async function () {
      // First add liquidity to the pool
      const liquidityAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      await mockUSDC.mint(await owner.getAddress(), liquidityAmount);
      await mockUSDC.connect(owner).approve(await loanMaster.getAddress(), liquidityAmount);
      await loanMaster.connect(owner).addLiquidity(3, liquidityAmount);

      // Borrow tokens first
      const initialBorrowAmount = ethers.parseUnits("500", 6); // 500 USDC
      await loanMaster.connect(user).borrow(3, initialBorrowAmount);

      // Fast forward time to accrue some interest (1 month)
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const borrowAmount = await loanMaster.getUserBorrow(3, await user.getAddress());

      // Calculate approximate interest manually for verification
      const secondsElapsed = BigInt(30 * 24 * 60 * 60);
      const borrowAPR = BigInt(1000); // 10%
      const secondsInYear = BigInt(365 * 24 * 60 * 60);
      const expectedInterest = (BigInt(borrowAmount) * borrowAPR * secondsElapsed) / (BigInt(100) * secondsInYear);
      const expectedRepayment = BigInt(borrowAmount) + expectedInterest;

      // Mint extra tokens to user for interest payment
      await mockUSDC.mint(await user.getAddress(), expectedInterest * BigInt(2)); // Extra buffer

      // Approve and repay
      await mockUSDC.connect(user).approve(await loanMaster.getAddress(), expectedRepayment * 2n);
      await loanMaster.connect(user).repayBorrow(3);

      // Check borrow was cleared
      expect(await loanMaster.getUserBorrow(3, await user.getAddress())).to.equal(0n);
    });
  });
});
