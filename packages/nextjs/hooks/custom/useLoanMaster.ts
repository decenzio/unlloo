import { useMemo, useState } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Move interfaces here to avoid circular dependencies
export interface LiquidityPool {
  liquidity: bigint;
  tokenAddress: Address;
  depositAPR: bigint;
  borrowAPR: bigint;
}

export interface PoolWithIndex extends LiquidityPool {
  index: number;
}

// Token addresses - update these after deployment
export const TOKEN_ADDRESSES = {
  USDC: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as Address,
  WETH: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as Address,
  WBTC: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" as Address,
};

// Token metadata mapping
export const tokenMetadata: Record<string, { name: string; symbol: string; iconColor: string; decimals: number }> = {
  [TOKEN_ADDRESSES.USDC]: {
    name: "USD Coin",
    symbol: "USDC",
    iconColor: "#2775CA",
    decimals: 6,
  },
  [TOKEN_ADDRESSES.WETH]: {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    iconColor: "#627EEA",
    decimals: 18,
  },
  [TOKEN_ADDRESSES.WBTC]: {
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    iconColor: "#F7931A",
    decimals: 8,
  },
};

// Utility functions
export const formatTokenAmount = (amount: bigint, decimals: number = 18): string => {
  return (Number(amount) / Math.pow(10, decimals)).toString();
};

export const parseTokenAmount = (amount: string, decimals: number = 18): bigint => {
  return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
};

export const formatAPR = (apr: bigint): string => {
  return `${Number(apr) / 100}%`;
};

export const calculateInterest = (principal: bigint, apr: bigint, timeElapsedSeconds: bigint): bigint => {
  const secondsInYear = 365n * 24n * 3600n;
  return (principal * apr * timeElapsedSeconds) / (100n * secondsInYear);
};

// Helper function to get token metadata
export const getTokenMetadata = (address: string) => {
  return (
    tokenMetadata[address] || {
      name: "Unknown Token",
      symbol: "UNK",
      iconColor: "#6B7280",
      decimals: 18,
    }
  );
};

const CONTRACT_NAME = "LoanMaster" as const;

export const useLoanMaster = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Get pool count
  const { data: poolCount, isLoading: poolCountLoading } = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPoolCount",
  });

  // Get pool data for each known token
  const usdcPool = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPoolByToken",
    args: [TOKEN_ADDRESSES.USDC],
  });

  const wethPool = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPoolByToken",
    args: [TOKEN_ADDRESSES.WETH],
  });

  const wbtcPool = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPoolByToken",
    args: [TOKEN_ADDRESSES.WBTC],
  });

  // Get user deposits for each token
  const usdcDeposit = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [TOKEN_ADDRESSES.USDC, address!],
    watch: true,
  });

  const wethDeposit = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [TOKEN_ADDRESSES.WETH, address!],
    watch: true,
  });

  const wbtcDeposit = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [TOKEN_ADDRESSES.WBTC, address!],
    watch: true,
  });

  // Get user borrows for each token
  const usdcBorrow = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [TOKEN_ADDRESSES.USDC, address!],
    watch: true,
  });

  const wethBorrow = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [TOKEN_ADDRESSES.WETH, address!],
    watch: true,
  });

  const wbtcBorrow = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [TOKEN_ADDRESSES.WBTC, address!],
    watch: true,
  });

  // Contract write hooks
  const { writeContractAsync: addLiquidityAsync } = useScaffoldWriteContract({
    contractName: CONTRACT_NAME,
  });

  const { writeContractAsync: removeLiquidityAsync } = useScaffoldWriteContract({
    contractName: CONTRACT_NAME,
  });

  const { writeContractAsync: borrowAsync } = useScaffoldWriteContract({
    contractName: CONTRACT_NAME,
  });

  const { writeContractAsync: repayBorrowAsync } = useScaffoldWriteContract({
    contractName: CONTRACT_NAME,
  });

  const { writeContractAsync: createPoolAsync } = useScaffoldWriteContract({
    contractName: CONTRACT_NAME,
  });

  // Process pools data
  const pools: PoolWithIndex[] = useMemo(() => {
    if (!poolCount) return [];

    const poolsData = [usdcPool.data, wethPool.data, wbtcPool.data];
    const result: PoolWithIndex[] = [];

    poolsData.forEach((poolData, index) => {
      if (poolData) {
        result.push({
          index,
          ...poolData,
        });
      }
    });

    return result;
  }, [poolCount, usdcPool.data, wethPool.data, wbtcPool.data]);

  // Process user positions
  const userPositions = useMemo(() => {
    if (!address) {
      return { deposits: [], borrows: [] };
    }

    const deposits = [];
    const borrows = [];

    // Check USDC positions
    if (usdcPool.data && usdcDeposit.data && usdcDeposit.data > 0n) {
      deposits.push({
        poolIndex: 0,
        tokenAddress: TOKEN_ADDRESSES.USDC,
        amount: usdcDeposit.data,
        pool: { index: 0, ...usdcPool.data },
      });
    }

    if (usdcPool.data && usdcBorrow.data && usdcBorrow.data > 0n) {
      borrows.push({
        poolIndex: 0,
        tokenAddress: TOKEN_ADDRESSES.USDC,
        amount: usdcBorrow.data,
        pool: { index: 0, ...usdcPool.data },
      });
    }

    // Check WETH positions
    if (wethPool.data && wethDeposit.data && wethDeposit.data > 0n) {
      deposits.push({
        poolIndex: 1,
        tokenAddress: TOKEN_ADDRESSES.WETH,
        amount: wethDeposit.data,
        pool: { index: 1, ...wethPool.data },
      });
    }

    if (wethPool.data && wethBorrow.data && wethBorrow.data > 0n) {
      borrows.push({
        poolIndex: 1,
        tokenAddress: TOKEN_ADDRESSES.WETH,
        amount: wethBorrow.data,
        pool: { index: 1, ...wethPool.data },
      });
    }

    // Check WBTC positions
    if (wbtcPool.data && wbtcDeposit.data && wbtcDeposit.data > 0n) {
      deposits.push({
        poolIndex: 2,
        tokenAddress: TOKEN_ADDRESSES.WBTC,
        amount: wbtcDeposit.data,
        pool: { index: 2, ...wbtcPool.data },
      });
    }

    if (wbtcPool.data && wbtcBorrow.data && wbtcBorrow.data > 0n) {
      borrows.push({
        poolIndex: 2,
        tokenAddress: TOKEN_ADDRESSES.WBTC,
        amount: wbtcBorrow.data,
        pool: { index: 2, ...wbtcPool.data },
      });
    }

    return { deposits, borrows };
  }, [
    address,
    usdcPool.data,
    wethPool.data,
    wbtcPool.data,
    usdcDeposit.data,
    wethDeposit.data,
    wbtcDeposit.data,
    usdcBorrow.data,
    wethBorrow.data,
    wbtcBorrow.data,
  ]);

  // Helper function to get pool index from token address
  const getPoolIndex = (tokenAddress: Address): number => {
    const tokenAddresses = [TOKEN_ADDRESSES.USDC, TOKEN_ADDRESSES.WETH, TOKEN_ADDRESSES.WBTC];
    return tokenAddresses.indexOf(tokenAddress);
  };

  // Helper functions
  const addLiquidity = async (tokenAddress: Address, amount: string, tokenDecimals: number = 18) => {
    try {
      setIsLoading(true);
      const poolIndex = getPoolIndex(tokenAddress);
      const amountWei = parseTokenAmount(amount, tokenDecimals);

      await addLiquidityAsync({
        functionName: "addLiquidity",
        args: [BigInt(poolIndex), amountWei],
      });

      notification.success(`Successfully added ${amount} tokens to liquidity pool`);
    } catch (error) {
      console.error("Add liquidity error:", error);
      notification.error("Failed to add liquidity");
    } finally {
      setIsLoading(false);
    }
  };

  const removeLiquidity = async (tokenAddress: Address) => {
    try {
      setIsLoading(true);
      const poolIndex = getPoolIndex(tokenAddress);

      await removeLiquidityAsync({
        functionName: "removeLiquidity",
        args: [BigInt(poolIndex)],
      });

      notification.success("Successfully removed liquidity from pool");
    } catch (error) {
      console.error("Remove liquidity error:", error);
      notification.error("Failed to remove liquidity");
    } finally {
      setIsLoading(false);
    }
  };

  const borrowToken = async (tokenAddress: Address, amount: string, tokenDecimals: number = 18) => {
    try {
      setIsLoading(true);
      const poolIndex = getPoolIndex(tokenAddress);
      const amountWei = parseTokenAmount(amount, tokenDecimals);

      await borrowAsync({
        functionName: "borrow",
        args: [BigInt(poolIndex), amountWei],
      });

      notification.success(`Successfully borrowed ${amount} tokens`);
    } catch (error) {
      console.error("Borrow error:", error);
      notification.error("Failed to borrow");
    } finally {
      setIsLoading(false);
    }
  };

  const repayBorrow = async (tokenAddress: Address) => {
    try {
      setIsLoading(true);
      const poolIndex = getPoolIndex(tokenAddress);

      await repayBorrowAsync({
        functionName: "repayBorrow",
        args: [BigInt(poolIndex)],
      });

      notification.success("Successfully repaid borrow");
    } catch (error) {
      console.error("Repay borrow error:", error);
      notification.error("Failed to repay borrow");
    } finally {
      setIsLoading(false);
    }
  };

  const createLiquidityPool = async (tokenAddress: Address, depositAPR: number, borrowAPR: number) => {
    try {
      setIsLoading(true);

      await createPoolAsync({
        functionName: "createLiquidityPool",
        args: [tokenAddress, BigInt(depositAPR * 100), BigInt(borrowAPR * 100)],
      });

      notification.success("Successfully created new liquidity pool");
    } catch (error) {
      console.error("Create pool error:", error);
      notification.error("Failed to create liquidity pool");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Data
    pools,
    userPositions,

    // Loading states
    isLoading: isLoading || poolCountLoading || usdcPool.isLoading || wethPool.isLoading || wbtcPool.isLoading,

    // Actions
    addLiquidity,
    removeLiquidity,
    borrow: borrowToken,
    repayBorrow,
    createLiquidityPool,

    // Utilities
    formatTokenAmount,
    parseTokenAmount,
    formatAPR,
    calculateInterest,
    getTokenMetadata,
    TOKEN_ADDRESSES,
  };
};
