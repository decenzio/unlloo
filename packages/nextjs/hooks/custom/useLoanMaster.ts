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

// Utility functions (moved from LoanMasterService)
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

const CONTRACT_NAME = "LoanMaster" as const;

export const useLoanMaster = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Get pool count
  const { data: poolCount, isLoading: poolCountLoading } = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPoolCount",
  });

  // Call hooks at the top level for each pool index (0-9)
  const pool0 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [0n],
  });

  const pool1 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [1n],
  });

  const pool2 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [2n],
  });

  const pool3 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [3n],
  });

  const pool4 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [4n],
  });

  const pool5 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [5n],
  });

  const pool6 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [6n],
  });

  const pool7 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [7n],
  });

  const pool8 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [8n],
  });

  const pool9 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getLiquidityPool",
    args: [9n],
  });

  // User deposit hooks
  const deposit0 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [0n, address!],
    watch: true,
  });

  const deposit1 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [1n, address!],
    watch: true,
  });

  const deposit2 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [2n, address!],
    watch: true,
  });

  const deposit3 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [3n, address!],
    watch: true,
  });

  const deposit4 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [4n, address!],
    watch: true,
  });

  const deposit5 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [5n, address!],
    watch: true,
  });

  const deposit6 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [6n, address!],
    watch: true,
  });

  const deposit7 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [7n, address!],
    watch: true,
  });

  const deposit8 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [8n, address!],
    watch: true,
  });

  const deposit9 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserDeposit",
    args: [9n, address!],
    watch: true,
  });

  // User borrow hooks
  const borrow0 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [0n, address!],
    watch: true,
  });

  const borrow1 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [1n, address!],
    watch: true,
  });

  const borrow2 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [2n, address!],
    watch: true,
  });

  const borrow3 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [3n, address!],
    watch: true,
  });

  const borrow4 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [4n, address!],
    watch: true,
  });

  const borrow5 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [5n, address!],
    watch: true,
  });

  const borrow6 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [6n, address!],
    watch: true,
  });

  const borrow7 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [7n, address!],
    watch: true,
  });

  const borrow8 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [8n, address!],
    watch: true,
  });

  const borrow9 = useScaffoldReadContract({
    contractName: CONTRACT_NAME,
    functionName: "getUserBorrow",
    args: [9n, address!],
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

  // Create arrays from individual hooks
  const poolHooks = [pool0, pool1, pool2, pool3, pool4, pool5, pool6, pool7, pool8, pool9];
  const depositHooks = [
    deposit0,
    deposit1,
    deposit2,
    deposit3,
    deposit4,
    deposit5,
    deposit6,
    deposit7,
    deposit8,
    deposit9,
  ];
  const borrowHooks = [borrow0, borrow1, borrow2, borrow3, borrow4, borrow5, borrow6, borrow7, borrow8, borrow9];

  // Process pools data
  const pools: PoolWithIndex[] = useMemo(() => {
    if (!poolCount) return [];

    const actualPoolCount = Number(poolCount);
    const result: PoolWithIndex[] = [];

    for (let i = 0; i < actualPoolCount && i < 10; i++) {
      const poolData = poolHooks[i].data;
      if (poolData) {
        result.push({
          index: i,
          ...poolData,
        });
      }
    }

    return result;
  }, [poolCount, poolHooks]);

  // Process user positions
  const userPositions = useMemo(() => {
    if (!poolCount || !address) {
      return { deposits: [], borrows: [] };
    }

    const actualPoolCount = Number(poolCount);
    const deposits = [];
    const borrows = [];

    for (let i = 0; i < actualPoolCount && i < 10; i++) {
      const pool = pools[i];
      const depositAmount = depositHooks[i].data || 0n;
      const borrowAmount = borrowHooks[i].data || 0n;

      if (pool && depositAmount > 0n) {
        deposits.push({
          poolIndex: i,
          amount: depositAmount,
          pool,
        });
      }

      if (pool && borrowAmount > 0n) {
        borrows.push({
          poolIndex: i,
          amount: borrowAmount,
          pool,
        });
      }
    }

    return { deposits, borrows };
  }, [poolCount, address, pools, depositHooks, borrowHooks]);

  // Helper functions
  const addLiquidity = async (poolIndex: number, amount: string, tokenDecimals: number = 18) => {
    try {
      setIsLoading(true);
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

  const removeLiquidity = async (poolIndex: number) => {
    try {
      setIsLoading(true);

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

  const borrowToken = async (poolIndex: number, amount: string, tokenDecimals: number = 18) => {
    try {
      setIsLoading(true);
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

  const repayBorrow = async (poolIndex: number) => {
    try {
      setIsLoading(true);

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
    isLoading: isLoading || poolCountLoading || poolHooks.some(h => h.isLoading),

    // Actions
    addLiquidity,
    removeLiquidity,
    borrow: borrowToken, // Renamed to avoid conflict with borrow hooks
    repayBorrow,
    createLiquidityPool,

    // Utilities
    formatTokenAmount,
    parseTokenAmount,
    formatAPR,
    calculateInterest,
  };
};
