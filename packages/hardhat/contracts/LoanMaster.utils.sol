// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct LiquidityPoolStruct {
    uint256 liquidity;
    mapping(address => uint256) deposits;
    mapping(address => uint256) depositTimestamps;
    mapping(address => uint256) borrows;
    mapping(address => uint256) borrowTimestamps;
    address tokenAddress;
    uint256 depositAPR;
    uint256 borrowAPR;
}

struct LiquidityPoolSimpleStruct {
    uint256 liquidity;
    address tokenAddress;
    uint256 depositAPR;
    uint256 borrowAPR;
}
