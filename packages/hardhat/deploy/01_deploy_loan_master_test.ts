import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the LoanMaster contract and initializes it with token addresses
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployLoanMaster: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n📡 Deploying LoanMaster...");

  // Deploy LoanMaster contract
  const loanMaster = await deploy("LoanMaster", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`\n🔧 LoanMaster deployed at: ${loanMaster.address}`);

  // For local development, deploy mock tokens
  let usdcAddress, wethAddress, wbtcAddress;

  // Check which network we're on
  const networkName = hre.network.name;

  if (networkName === "localhost" || networkName === "hardhat") {
    // For local development, deploy mock tokens
    console.log("\n📡 Deploying mock tokens for local development...");

    // First deploy the MockERC20 contract
    const mockUSDC = await deploy("MockERC20", {
      from: deployer,
      args: ["USD Coin", "USDC", 6],
      log: true,
      autoMine: true,
    });
    usdcAddress = mockUSDC.address;
    console.log(`\n🔧 Mock USDC deployed at: ${usdcAddress}`);

    const mockWETH = await deploy("MockERC20", {
      from: deployer,
      args: ["Wrapped Ether", "WETH", 18],
      log: true,
      autoMine: true,
    });
    wethAddress = mockWETH.address;
    console.log(`\n🔧 Mock WETH deployed at: ${wethAddress}`);

    const mockWBTC = await deploy("MockERC20", {
      from: deployer,
      args: ["Wrapped Bitcoin", "WBTC", 8],
      log: true,
      autoMine: true,
    });
    wbtcAddress = mockWBTC.address;
    console.log(`\n🔧 Mock WBTC deployed at: ${wbtcAddress}`);
  } else if (networkName === "goerli") {
    // Use Goerli testnet addresses
    usdcAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
    wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
    wbtcAddress = "0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05";
  } else if (networkName === "sepolia") {
    // Use Sepolia testnet addresses
    usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Example - replace with actual address
    wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"; // Example - replace with actual address
    wbtcAddress = "0xCA063A2AB07491eE991dCecb456D1265f842b568"; // Example - replace with actual address
  } else {
    // For other networks, these need to be set manually
    console.log("\n⚠️ Please manually configure token addresses for this network in the deployment script.");
    usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Replace with actual addresses
    wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"; // Replace with actual addresses
    wbtcAddress = "0xCA063A2AB07491eE991dCecb456D1265f842b568"; // Replace with actual addresses
  }

  // Get the deployed LoanMaster contract instance
  const loanMasterInstance = await hre.ethers.getContractAt("LoanMaster", loanMaster.address);

  // Initialize pools with token addresses
  console.log("\n📡 Initializing liquidity pools...");
  const tx = await loanMasterInstance.initializePools(usdcAddress, wethAddress, wbtcAddress);
  await tx.wait();

  console.log("\n✅ Liquidity pools initialized!");
  console.log(`   - USDC Pool: ${usdcAddress}`);
  console.log(`   - WETH Pool: ${wethAddress}`);
  console.log(`   - WBTC Pool: ${wbtcAddress}`);

  // If we're on a local network and deployed mock tokens, mint some tokens to the deployer
  if (networkName === "localhost" || networkName === "hardhat") {
    console.log("\n📡 Minting test tokens to the deployer...");

    const usdcContract = await hre.ethers.getContractAt("MockERC20", usdcAddress);
    await await usdcContract.mint(deployer, "1000000000000"); // 1 million USDC

    const wethContract = await hre.ethers.getContractAt("MockERC20", wethAddress);
    await await wethContract.mint(deployer, "1000000000000000000000"); // 1000 WETH

    const wbtcContract = await hre.ethers.getContractAt("MockERC20", wbtcAddress);
    await await wbtcContract.mint(deployer, "1000000000"); // 10 WBTC

    console.log("✅ Test tokens minted to the deployer!");
  }

  console.log("\n✅ Deployment complete!");
};

export default deployLoanMaster;

deployLoanMaster.tags = ["LoanMaster"];
