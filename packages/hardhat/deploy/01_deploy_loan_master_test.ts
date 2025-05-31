import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the LoanMaster contract, deploys (or references) tokens,
 * adds initial liquidity, and funds all user accounts on local networks.
 */
const deployLoanMaster: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { ethers } = hre;

  console.log("\n📡 Deploying LoanMaster...");

  // ──────────────────────────────────────────────────────
  // 1. Deploy LoanMaster
  // ──────────────────────────────────────────────────────
  const loanMaster = await deploy("LoanMaster", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`\n🔧 LoanMaster deployed at: ${loanMaster.address}`);

  // ──────────────────────────────────────────────────────
  // 2. Token setup
  // ──────────────────────────────────────────────────────
  const networkName = hre.network.name;
  let usdcAddress: string;
  let wethAddress: string;
  let wbtcAddress: string;

  if (networkName === "localhost" || networkName === "hardhat") {
    console.log("\n📡 Deploying mock tokens for local development...");

    const mockUSDC = await deploy("MockERC20", {
      from: deployer,
      args: ["USD Coin", "USDC", 6],
      log: true,
      autoMine: true,
    });
    usdcAddress = mockUSDC.address;
    console.log(`🔧 Mock USDC at ${usdcAddress}`);

    const mockWETH = await deploy("MockERC20", {
      from: deployer,
      args: ["Wrapped Ether", "WETH", 18],
      log: true,
      autoMine: true,
    });
    wethAddress = mockWETH.address;
    console.log(`🔧 Mock WETH at ${wethAddress}`);

    const mockWBTC = await deploy("MockERC20", {
      from: deployer,
      args: ["Wrapped Bitcoin", "WBTC", 8],
      log: true,
      autoMine: true,
    });
    wbtcAddress = mockWBTC.address;
    console.log(`🔧 Mock WBTC at ${wbtcAddress}`);
  } else if (networkName === "goerli") {
    usdcAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
    wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
    wbtcAddress = "0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05";
  } else if (networkName === "sepolia") {
    usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
    wbtcAddress = "0xCA063A2AB07491eE991dCecb456D1265f842b568";
  } else {
    console.log("\n⚠️  Configure token addresses for this network:");
    usdcAddress = "0x...";
    wethAddress = "0x...";
    wbtcAddress = "0x...";
  }

  // ──────────────────────────────────────────────────────
  // 3. Initialise pools
  // ──────────────────────────────────────────────────────
  const loanMasterInstance = await ethers.getContractAt("LoanMaster", loanMaster.address);

  console.log("\n📡 Initializing liquidity pools...");
  await (await loanMasterInstance.initializePools(usdcAddress, wethAddress, wbtcAddress)).wait();
  console.log("✅ Liquidity pools initialised!");

  // ──────────────────────────────────────────────────────
  // 4. Local mint & liquidity
  // ──────────────────────────────────────────────────────
  if (networkName === "localhost" || networkName === "hardhat") {
    const usdcContract = await ethers.getContractAt("MockERC20", usdcAddress);
    const wethContract = await ethers.getContractAt("MockERC20", wethAddress);
    const wbtcContract = await ethers.getContractAt("MockERC20", wbtcAddress);

    console.log("\n📡 Minting tokens to deployer...");
    await (await usdcContract.mint(deployer, "1000000000000")).wait(); // 1 000 000 USDC
    await (await wethContract.mint(deployer, "1000000000000000000000")).wait(); // 1 000 WETH
    await (await wbtcContract.mint(deployer, "1000000000")).wait(); // 10 WBTC
    console.log("✅ Deployer funded!");

    console.log("\n📡 Adding initial liquidity...");
    await (await usdcContract.approve(loanMaster.address, "500000000000")).wait(); // 500 000
    await (await wethContract.approve(loanMaster.address, "500000000000000000000")).wait(); // 500
    await (await wbtcContract.approve(loanMaster.address, "500000000")).wait(); // 5

    await (await loanMasterInstance.addLiquidity(0, "500000000000")).wait(); // USDC
    await (await loanMasterInstance.addLiquidity(1, "500000000000000000000")).wait(); // WETH
    await (await loanMasterInstance.addLiquidity(2, "500000000")).wait(); // WBTC
    console.log("✅ Liquidity added!");

    // Display pool balances
    const format = ethers.formatUnits;
    const usdcBal = await loanMasterInstance.getTotalLiquidity(usdcAddress);
    const wethBal = await loanMasterInstance.getTotalLiquidity(wethAddress);
    const wbtcBal = await loanMasterInstance.getTotalLiquidity(wbtcAddress);

    console.log("\n📊 Pool liquidity:");
    console.log(`   • USDC: ${format(usdcBal, 6)} (${usdcBal})`);
    console.log(`   • WETH: ${format(wethBal, 18)} (${wethBal})`);
    console.log(`   • WBTC: ${format(wbtcBal, 8)} (${wbtcBal})`);
  }

  // ──────────────────────────────────────────────────────
  // 5. Fund all available test accounts
  // ──────────────────────────────────────────────────────
  if (networkName === "localhost" || networkName === "hardhat") {
    console.log("\n📡 Funding all user accounts in the local network...");

    const allAccounts = await ethers.getSigners();
    const usdcContract = await ethers.getContractAt("MockERC20", usdcAddress);
    const wethContract = await ethers.getContractAt("MockERC20", wethAddress);
    const wbtcContract = await ethers.getContractAt("MockERC20", wbtcAddress);

    for (const acct of allAccounts) {
      if (acct.address.toLowerCase() === deployer.toLowerCase()) continue;

      console.log(`   → Funding ${acct.address}`);

      await (await usdcContract.mint(acct.address, "100000000000")).wait(); // 100 000 USDC
      await (await wethContract.mint(acct.address, "100000000000000000000")).wait(); // 100 WETH
      await (await wbtcContract.mint(acct.address, "100000000")).wait(); // 1 WBTC
    }

    console.log("✅ All user accounts funded!");
  }

  // ──────────────────────────────────────────────────────
  // 6. Summary
  // ──────────────────────────────────────────────────────
  console.log("\n📝 Deployment summary:");
  console.log(`   LoanMaster : ${loanMaster.address}`);
  console.log(`   USDC token : ${usdcAddress}`);
  console.log(`   WETH token : ${wethAddress}`);
  console.log(`   WBTC token : ${wbtcAddress}`);
  console.log("   Ready for testing 🔥");
};

export default deployLoanMaster;
deployLoanMaster.tags = ["LoanMaster"];
