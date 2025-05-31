import { ethers } from "hardhat";
import { parseUnits, formatUnits } from "ethers";

async function main() {
  console.log("🧪 Testing LoanMaster Contract...");

  // Get deployed contracts
  const loanMaster = await ethers.getContract("LoanMaster");
  const mockUSDC = await ethers.getContract("MockUSDC");
  const mockWETH = await ethers.getContract("MockWETH");
  const mockWBTC = await ethers.getContract("MockWBTC");

  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();

  console.log(`\n👤 Test Users:`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   User1: ${user1.address}`);
  console.log(`   User2: ${user2.address}`);

  // Test 1: User1 borrows USDC
  console.log(`\n📝 Test 1: User1 borrows 100 USDC`);
  const borrowAmount = parseUnits("100", 6);

  console.log(`   Initial USDC balance: ${formatUnits(await mockUSDC.balanceOf(user1.address), 6)}`);

  // Borrow
  await loanMaster.connect(user1).borrow(0, borrowAmount);
  console.log(`   ✅ Borrowed 100 USDC`);
  console.log(`   New USDC balance: ${formatUnits(await mockUSDC.balanceOf(user1.address), 6)}`);

  // Check user borrow
  const userBorrow = await loanMaster.getUserBorrow(0, user1.address);
  console.log(`   User borrow amount: ${formatUnits(userBorrow, 6)} USDC`);

  // Test 2: User2 adds liquidity to WETH pool
  console.log(`\n📝 Test 2: User2 adds 1 WETH liquidity`);
  const liquidityAmount = parseUnits("1", 18);

  // Approve and add liquidity
  await mockWETH.connect(user2).approve(loanMaster.target, liquidityAmount);
  await loanMaster.connect(user2).addLiquidity(1, liquidityAmount);
  console.log(`   ✅ Added 1 WETH liquidity`);

  // Check user deposit
  const userDeposit = await loanMaster.getUserDeposit(1, user2.address);
  console.log(`   User deposit amount: ${formatUnits(userDeposit, 18)} WETH`);

  // Test 3: Wait and then repay borrow (simulate time passing)
  console.log(`\n📝 Test 3: User1 repays USDC borrow`);

  // Calculate repay amount (with some buffer for interest)
  const repayAmount = parseUnits("105", 6); // 100 + some buffer for interest
  await mockUSDC.connect(user1).approve(loanMaster.target, repayAmount);

  try {
    await loanMaster.connect(user1).repayBorrow(0);
    console.log(`   ✅ Repaid USDC borrow`);

    // Check if borrow is cleared
    const userBorrowAfter = await loanMaster.getUserBorrow(0, user1.address);
    console.log(`   User borrow after repay: ${formatUnits(userBorrowAfter, 6)} USDC`);
  } catch (error) {
    console.log(`   ❌ Repay failed: ${error}`);
  }

  // Test 4: User2 removes liquidity
  console.log(`\n📝 Test 4: User2 removes WETH liquidity`);

  try {
    const wethBalanceBefore = await mockWETH.balanceOf(user2.address);
    await loanMaster.connect(user2).removeLiquidity(1);
    const wethBalanceAfter = await mockWETH.balanceOf(user2.address);

    console.log(`   ✅ Removed WETH liquidity`);
    console.log(`   WETH gained: ${formatUnits(wethBalanceAfter - wethBalanceBefore, 18)} WETH`);

    // Check if deposit is cleared
    const userDepositAfter = await loanMaster.getUserDeposit(1, user2.address);
    console.log(`   User deposit after removal: ${formatUnits(userDepositAfter, 18)} WETH`);
  } catch (error) {
    console.log(`   ❌ Liquidity removal failed: ${error}`);
  }

  // Display final pool states
  console.log(`\n📊 Final Pool States:`);
  const poolCount = await loanMaster.getLiquidityPoolCount();

  for (let i = 0; i < poolCount; i++) {
    const pool = await loanMaster.getLiquidityPool(i);
    let tokenSymbol = "";
    let decimals = 18;

    if (pool.tokenAddress === mockUSDC.target) {
      tokenSymbol = "USDC";
      decimals = 6;
    } else if (pool.tokenAddress === mockWETH.target) {
      tokenSymbol = "WETH";
      decimals = 18;
    } else if (pool.tokenAddress === mockWBTC.target) {
      tokenSymbol = "WBTC";
      decimals = 8;
    }

    console.log(`   Pool ${i} (${tokenSymbol}): ${formatUnits(pool.liquidity, decimals)} ${tokenSymbol}`);
  }

  console.log(`\n🎉 Testing Complete!`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
