// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

import { LiquidityPoolSimpleStruct, LiquidityPoolStruct } from "./LoanMaster.utils.sol";

contract LoanMaster {
    // array of liquidity pools
    LiquidityPoolStruct[] private liquidityPools; //private set public get
    address private owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        // Create three liquidity pools directly in the constructor
        // USDC pool
        LiquidityPoolStruct storage usdcPool = liquidityPools.push();
        usdcPool.tokenAddress = 0xF1815bd50389c46847f0Bda824eC8da914045D14;
        usdcPool.depositAPR = 500;
        usdcPool.borrowAPR = 1000;

        // WETH pool
        LiquidityPoolStruct storage wethPool = liquidityPools.push();
        wethPool.tokenAddress = 0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590;
        wethPool.depositAPR = 300;
        wethPool.borrowAPR = 800;

        // WBTC pool
        LiquidityPoolStruct storage wbtcPool = liquidityPools.push();
        wbtcPool.tokenAddress = 0xA0197b2044D28b08Be34d98b23c9312158Ea9A18;
        wbtcPool.depositAPR = 400;
        wbtcPool.borrowAPR = 900;
    }

    function createLiquidityPool(address tokenAddress, uint256 depositAPR, uint256 borrowAPR) external onlyOwner {
        // Create a new liquidity pool in storage
        LiquidityPoolStruct storage newPool = liquidityPools.push();

        // Set the pool properties
        newPool.tokenAddress = tokenAddress;
        newPool.depositAPR = depositAPR;
        newPool.borrowAPR = borrowAPR;

        // Note: No need for a second push - the pool is already added to the array
        // by the first push() operation which returns a storage reference
    }

    function addLiquidity(uint256 poolIndex, uint256 amount) external payable {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        require(amount > 0, "Amount must be greater than 0");
        require(pool.deposits[msg.sender] == 0, "Must withdraw existing deposit first");

        IERC20(pool.tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
        pool.liquidity += amount;

        // Update the user's deposit balance
        pool.deposits[msg.sender] = amount;
        // Store the current block timestamp for the deposit
        pool.depositTimestamps[msg.sender] = block.timestamp;
    }

    function removeLiquidity(uint256 poolIndex) external {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        uint256 depositAmount = pool.deposits[msg.sender];
        require(depositAmount > 0, "No deposit to withdraw");

        // Calculate interest based on time elapsed and depositAPR
        uint256 depositTime = pool.depositTimestamps[msg.sender];
        uint256 timeElapsedInSeconds = block.timestamp - depositTime;

        // Calculate interest: principal * APR * timeElapsed / secondsInYear
        // This uses simple interest formula with time measured in seconds
        uint256 secondsInYear = 365 days;
        uint256 interest = (depositAmount * pool.depositAPR * timeElapsedInSeconds) / (100 * secondsInYear);

        uint256 totalAmount = depositAmount + interest;
        require(pool.liquidity >= totalAmount, "Insufficient liquidity in the pool");

        // Update the user's deposit balance
        delete pool.deposits[msg.sender];
        delete pool.depositTimestamps[msg.sender];
        pool.liquidity -= totalAmount;

        // Transfer the tokens back to the user (principal + interest)
        IERC20(pool.tokenAddress).safeTransfer(msg.sender, totalAmount);
    }

    //borrowing stuff/call to another contract
    function borrow(uint256 poolIndex, uint256 amount) external payable {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        require(amount > 0, "Amount must be greater than 0");
        require(pool.liquidity >= amount, "Insufficient liquidity in the pool"); // This line checks if there's enough liquidity

        // Update the user's borrow balance
        pool.borrows[msg.sender] += amount;
        // Store the current block timestamp for the borrow
        pool.borrowTimestamps[msg.sender] = block.timestamp;
        pool.liquidity -= amount;

        //check for the other contract if we can do borrowing
        //for now allow all

        // Transfer the tokens to the user
        IERC20(pool.tokenAddress).safeTransfer(msg.sender, amount);
    }

    function repayBorrow(uint256 poolIndex) external {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        uint256 borrowedAmount = pool.borrows[msg.sender];
        require(borrowedAmount > 0, "No borrow to repay");

        // We need to track borrow timestamps like we do with deposits
        uint256 borrowTime = pool.borrowTimestamps[msg.sender];
        uint256 timeElapsedInSeconds = block.timestamp - borrowTime;

        // Calculate interest: principal * APR * timeElapsed / secondsInYear
        uint256 secondsInYear = 365 days;
        uint256 interest = (borrowedAmount * pool.borrowAPR * timeElapsedInSeconds) / (100 * secondsInYear);

        uint256 totalRepayAmount = borrowedAmount + interest;

        // Update the user's borrow balance before transfer
        delete pool.borrows[msg.sender];
        delete pool.borrowTimestamps[msg.sender];
        pool.liquidity += borrowedAmount; // Only add the principal back to liquidity

        // Transfer the tokens back to the contract (principal + interest)
        IERC20(pool.tokenAddress).safeTransferFrom(msg.sender, address(this), totalRepayAmount);
    }

    //Getters
    function getLiquidityPoolCount() external view returns (uint256) {
        return liquidityPools.length;
    }

    function getLiquidityPool(uint256 poolIndex) external view returns (LiquidityPoolSimpleStruct memory) {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];
        return
            LiquidityPoolSimpleStruct({
                liquidity: pool.liquidity,
                tokenAddress: pool.tokenAddress,
                depositAPR: pool.depositAPR,
                borrowAPR: pool.borrowAPR
            });
    }

    function getUserDeposit(uint256 poolIndex, address user) external view returns (uint256) {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];
        return pool.deposits[user];
    }

    function getUserBorrow(uint256 poolIndex, address user) external view returns (uint256) {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];
        return pool.borrows[user];
    }

    function getTotalLiquidity(uint256 poolIndex) external view returns (uint256) {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];
        return pool.liquidity;
    }
}
