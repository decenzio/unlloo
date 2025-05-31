// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

    using SafeERC20 for IERC20;

    struct LiquidityPoolStruct {
        uint256 liquidity;
        address tokenAddress;
        uint256 depositAPR;
        uint256 borrowAPR;
        mapping(address => uint256) deposits;
        mapping(address => uint256) depositTimestamps;
        mapping(address => uint256) borrows;
        mapping(address => uint256) borrowTimestamps;
    }

    struct LiquidityPoolSimpleStruct {
        uint256 liquidity;
        address tokenAddress;
        uint256 depositAPR;
        uint256 borrowAPR;
    }

contract LoanMaster {
    // array of liquidity pools
    LiquidityPoolStruct[] private liquidityPools;
    address private owner;

    event LiquidityAdded(address indexed user, uint256 indexed poolIndex, uint256 amount);
    event LiquidityRemoved(address indexed user, uint256 indexed poolIndex, uint256 amount, uint256 interest);
    event Borrowed(address indexed user, uint256 indexed poolIndex, uint256 amount);
    event BorrowRepaid(address indexed user, uint256 indexed poolIndex, uint256 principal);
    event PoolCreated(uint256 indexed poolIndex, address indexed tokenAddress, uint256 depositAPR, uint256 borrowAPR);

    // Add custom errors for better debugging
    error PoolNotFound(address tokenAddress);
    error NoBorrowToRepay(address user);
    error InsufficientLiquidity(uint256 required, uint256 available);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Initialize pools with actual token addresses after deployment
    function initializePools(address usdcToken, address wethToken, address wbtcToken) external onlyOwner {
        require(liquidityPools.length == 0, "Pools already initialized");

        // USDC pool
        LiquidityPoolStruct storage usdcPool = liquidityPools.push();
        usdcPool.tokenAddress = usdcToken;
        usdcPool.depositAPR = 500; // 5% (kept for display purposes)
        usdcPool.borrowAPR = 0; // 0% - no interest on borrowing
        emit PoolCreated(0, usdcToken, 500, 0);

        // WETH pool
        LiquidityPoolStruct storage wethPool = liquidityPools.push();
        wethPool.tokenAddress = wethToken;
        wethPool.depositAPR = 300; // 3% (kept for display purposes)
        wethPool.borrowAPR = 0; // 0% - no interest on borrowing
        emit PoolCreated(1, wethToken, 300, 0);

        // WBTC pool
        LiquidityPoolStruct storage wbtcPool = liquidityPools.push();
        wbtcPool.tokenAddress = wbtcToken;
        wbtcPool.depositAPR = 400; // 4% (kept for display purposes)
        wbtcPool.borrowAPR = 0; // 0% - no interest on borrowing
        emit PoolCreated(2, wbtcToken, 400, 0);
    }

    function createLiquidityPool(address tokenAddress, uint256 depositAPR, uint256 borrowAPR) external onlyOwner {
        LiquidityPoolStruct storage newPool = liquidityPools.push();
        newPool.tokenAddress = tokenAddress;
        newPool.depositAPR = depositAPR;
        newPool.borrowAPR = borrowAPR;

        emit PoolCreated(liquidityPools.length - 1, tokenAddress, depositAPR, borrowAPR);
    }

    function addLiquidity(uint256 poolIndex, uint256 amount) external {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        require(amount > 0, "Amount must be greater than 0");
        require(pool.deposits[msg.sender] == 0, "Must withdraw existing deposit first");

        IERC20(pool.tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
        pool.liquidity += amount;
        pool.deposits[msg.sender] = amount;
        pool.depositTimestamps[msg.sender] = block.timestamp;

        emit LiquidityAdded(msg.sender, poolIndex, amount);
    }

    function removeLiquidity(uint256 poolIndex) external {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        uint256 depositAmount = pool.deposits[msg.sender];
        require(depositAmount > 0, "No deposit to withdraw");

        uint256 depositTime = pool.depositTimestamps[msg.sender];
        uint256 timeElapsedInSeconds = block.timestamp - depositTime;
        uint256 secondsInYear = 365 days;

        // Calculate interest for deposits (deposits still earn interest)
        uint256 interest = (depositAmount * pool.depositAPR * timeElapsedInSeconds) / (10000 * secondsInYear);

        uint256 totalAmount = depositAmount + interest;
        require(pool.liquidity >= totalAmount, "Insufficient liquidity in the pool");

        delete pool.deposits[msg.sender];
        delete pool.depositTimestamps[msg.sender];
        pool.liquidity -= totalAmount;

        IERC20(pool.tokenAddress).safeTransfer(msg.sender, totalAmount);
        emit LiquidityRemoved(msg.sender, poolIndex, depositAmount, interest);
    }

    function borrow(uint256 poolIndex, uint256 amount) external {
        require(poolIndex < liquidityPools.length, "Invalid pool index");
        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        require(amount > 0, "Amount must be greater than 0");
        require(pool.liquidity >= amount, "Insufficient liquidity in the pool");

        pool.borrows[msg.sender] += amount;
        pool.borrowTimestamps[msg.sender] = block.timestamp;
        pool.liquidity -= amount;

        IERC20(pool.tokenAddress).safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, poolIndex, amount);
    }

    function repayBorrow(address tokenId) external {
        uint256 poolIndex = type(uint256).max;

        // Find the pool with the matching token address
        for (uint256 i = 0; i < liquidityPools.length; i++) {
            if (liquidityPools[i].tokenAddress == tokenId) {
                poolIndex = i;
                break;
            }
        }

        if (poolIndex == type(uint256).max) {
            revert PoolNotFound(tokenId);
        }

        LiquidityPoolStruct storage pool = liquidityPools[poolIndex];

        uint256 borrowedAmount = pool.borrows[msg.sender];
        if (borrowedAmount == 0) {
            revert NoBorrowToRepay(msg.sender);
        }

        // No interest calculation - just repay the principal amount
        uint256 totalRepayAmount = borrowedAmount;

        // Clear the borrow before external calls
        delete pool.borrows[msg.sender];
        delete pool.borrowTimestamps[msg.sender];

        // Add back the principal to liquidity
        pool.liquidity += borrowedAmount;

        // Transfer only the borrowed amount (no interest)
        IERC20(tokenId).safeTransferFrom(msg.sender, address(this), totalRepayAmount);

        // Updated event - no interest parameter
        emit BorrowRepaid(msg.sender, poolIndex, borrowedAmount);
    }

    // Getters
    function getLiquidityPoolCount() external view returns (uint256) {
        return liquidityPools.length;
    }

    function getLiquidityPoolByToken(address tokenId) external view returns (LiquidityPoolSimpleStruct memory) {
        for (uint256 i = 0; i < liquidityPools.length; i++) {
            if (liquidityPools[i].tokenAddress == tokenId) {
                return
                    LiquidityPoolSimpleStruct({
                    liquidity: liquidityPools[i].liquidity,
                    tokenAddress: liquidityPools[i].tokenAddress,
                    depositAPR: liquidityPools[i].depositAPR,
                    borrowAPR: liquidityPools[i].borrowAPR
                });
            }
        }
        revert("Pool not found for token address");
    }

    function getUserDeposit(address tokenId, address user) external view returns (uint256) {
        for (uint256 i = 0; i < liquidityPools.length; i++) {
            if (liquidityPools[i].tokenAddress == tokenId) {
                return liquidityPools[i].deposits[user];
            }
        }
        revert("Pool not found for token address");
    }

    function getUserBorrow(address tokenId, address user) external view returns (uint256) {
        for (uint256 i = 0; i < liquidityPools.length; i++) {
            if (liquidityPools[i].tokenAddress == tokenId) {
                return liquidityPools[i].borrows[user];
            }
        }
        revert("Pool not found for token address");
    }

    function getTotalLiquidity(address tokenId) external view returns (uint256) {
        for (uint256 i = 0; i < liquidityPools.length; i++) {
            if (liquidityPools[i].tokenAddress == tokenId) {
                return liquidityPools[i].liquidity;
            }
        }
        revert("Pool not found for token address");
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    // New function to get exact repayment amount (same as borrowed amount)
    function getRepaymentAmount(address tokenId, address user) external view returns (uint256) {
        for (uint256 i = 0; i < liquidityPools.length; i++) {
            if (liquidityPools[i].tokenAddress == tokenId) {
                return liquidityPools[i].borrows[user]; // No interest, just return borrowed amount
            }
        }
        revert("Pool not found for token address");
    }
}