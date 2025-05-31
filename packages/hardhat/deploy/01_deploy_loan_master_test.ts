import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers";

/**
 * Deploys LoanMaster contract with mock ERC20 tokens for testing
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployLoanMasterTest: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log(`\n🚀 Deploying LoanMaster Test Environment...`);
  console.log(`📅 Date: 2025-05-31 11:53:22 UTC`);
  console.log(`👤 Deployer: ${deployer}`);

  // Deploy Mock ERC20 tokens
  console.log(`\n📊 Deploying Mock ERC20 Tokens...`);

  // Deploy Mock USDC (6 decimals)
  const mockUSDC = await deploy("MockUSDC", {
    contract: "MockERC20",
    from: deployer,
    args: ["USD Coin", "USDC", 6, 1000000], // 1M USDC initial supply
    log: true,
    autoMine: true,
  });

  // Deploy Mock WETH (18 decimals)
  const mockWETH = await deploy("MockWETH", {
    contract: "MockERC20",
    from: deployer,
    args: ["Wrapped Ethereum", "WETH", 18, 1000], // 1000 WETH initial supply
    log: true,
    autoMine: true,
  });

  // Deploy Mock WBTC (8 decimals)
  const mockWBTC = await deploy("MockWBTC", {
    contract: "MockERC20",
    from: deployer,
    args: ["Wrapped Bitcoin", "WBTC", 8, 100], // 100 WBTC initial supply
    log: true,
    autoMine: true,
  });

  console.log(`✅ Mock tokens deployed:`);
  console.log(`   USDC: ${mockUSDC.address}`);
  console.log(`   WETH: ${mockWETH.address}`);
  console.log(`   WBTC: ${mockWBTC.address}`);

  // Deploy LoanMaster contract
  console.log(`\n🏦 Deploying LoanMaster Contract...`);
  const loanMaster = await deploy("LoanMaster", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  // Get contract instances
  const loanMasterContract = await hre.ethers.getContract("LoanMaster", deployer);
  const usdcContract = await hre.ethers.getContract("MockUSDC", deployer);
  const wethContract = await hre.ethers.getContract("MockWETH", deployer);
  const wbtcContract = await hre.ethers.getContract("MockWBTC", deployer);

  // Initialize pools with token addresses
  console.log(`\n🔧 Initializing Liquidity Pools...`);
  const initTx = await loanMasterContract.initializePools(mockUSDC.address, mockWETH.address, mockWBTC.address);
  await initTx.wait();

  // Check pool count
  const poolCount = await loanMasterContract.getLiquidityPoolCount();
  console.log(`✅ ${poolCount} liquidity pools initialized`);

  // Display pool information
  for (let i = 0; i < poolCount; i++) {
    // Fixed typo in function name: getLiquidityPoolByToekn -> getLiquidityPoolByToken
    const tokenAddress = i === 0 ? mockUSDC.address : i === 1 ? mockWETH.address : mockWBTC.address;
    const pool = await loanMasterContract.getLiquidityPoolByToken(tokenAddress);
    console.log(`   Pool ${i}:`);
    console.log(`     Token: ${pool.tokenAddress}`);
    console.log(`     Deposit APR: ${Number(pool.depositAPR) / 100}%`);
    console.log(`     Borrow APR: ${Number(pool.borrowAPR) / 100}%`);
    console.log(`     Liquidity: ${pool.liquidity}`);
  }

  // Setup test scenario - add initial liquidity
  console.log(`\n💰 Setting up test liquidity...`);

  // Add liquidity to USDC pool (10,000 USDC)
  const usdcAmount = parseUnits("10000", 6);
  await usdcContract.approve(loanMaster.address, usdcAmount);
  await loanMasterContract.addLiquidity(0, usdcAmount);
  console.log(`✅ Added 10,000 USDC to pool 0`);

  // Add liquidity to WETH pool (5 WETH)
  const wethAmount = parseUnits("5", 18);
  await wethContract.approve(loanMaster.address, wethAmount);
  await loanMasterContract.addLiquidity(1, wethAmount);
  console.log(`✅ Added 5 WETH to pool 1`);

  // Add liquidity to WBTC pool (0.5 WBTC)
  const wbtcAmount = parseUnits("0.5", 8);
  await wbtcContract.approve(loanMaster.address, wbtcAmount);
  await loanMasterContract.addLiquidity(2, wbtcAmount);
  console.log(`✅ Added 0.5 WBTC to pool 2`);

  // Create test accounts with tokens
  const accounts = await hre.ethers.getSigners();
  console.log(`\n👥 Setting up test accounts with tokens...`);

  for (let i = 1; i < Math.min(accounts.length, 4); i++) {
    const account = accounts[i];
    console.log(`   Account ${i}: ${account.address}`);

    // Give tokens to test accounts
    await usdcContract.connect(account).faucet(); // 1000 USDC
    await wethContract.connect(account).faucet(); // 1000 WETH
    await wbtcContract.connect(account).faucet(); // 1000 WBTC

    const usdcBalance = await usdcContract.balanceOf(account.address);
    const wethBalance = await wethContract.balanceOf(account.address);
    const wbtcBalance = await wbtcContract.balanceOf(account.address);

    console.log(`     USDC: ${hre.ethers.formatUnits(usdcBalance, 6)}`);
    console.log(`     WETH: ${hre.ethers.formatUnits(wethBalance, 18)}`);
    console.log(`     WBTC: ${hre.ethers.formatUnits(wbtcBalance, 8)}`);
  }

  // Display final pool states
  console.log(`\n📊 Final Pool States:`);
  const tokenAddresses = [mockUSDC.address, mockWETH.address, mockWBTC.address];
  const tokenSymbols = ["USDC", "WETH", "WBTC"];
  const tokenDecimals = [6, 18, 8];

  for (let i = 0; i < poolCount; i++) {
    // Fixed function call to use getLiquidityPoolByToken instead of getLiquidityPool
    const pool = await loanMasterContract.getLiquidityPoolByToken(tokenAddresses[i]);
    const tokenSymbol = tokenSymbols[i];
    const decimals = tokenDecimals[i];

    console.log(`   Pool ${i} (${tokenSymbol}):`);
    console.log(`     Liquidity: ${hre.ethers.formatUnits(pool.liquidity, decimals)} ${tokenSymbol}`);
    console.log(`     Deposit APR: ${Number(pool.depositAPR) / 100}%`);
    console.log(`     Borrow APR: ${Number(pool.borrowAPR) / 100}%`);
  }

  console.log(`\n🎉 LoanMaster Test Environment Setup Complete!`);
  console.log(`\n📋 Contract Addresses:`);
  console.log(`   LoanMaster: ${loanMaster.address}`);
  console.log(`   MockUSDC: ${mockUSDC.address}`);
  console.log(`   MockWETH: ${mockWETH.address}`);
  console.log(`   MockWBTC: ${mockWBTC.address}`);

  console.log(`\n🧪 Test Commands:`);
  console.log(`   npx hardhat test --network localhost`);
  console.log(`   npx hardhat run scripts/test-loan-master.ts --network localhost`);
};

export default deployLoanMasterTest;

deployLoanMasterTest.tags = ["LoanMasterTest", "MockTokens"];
