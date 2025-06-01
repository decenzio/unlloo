import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

// Constants
const SIMULATION_DAYS = 7;
const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;

// Types
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  iconColor: string;
  imageUrl: string;
}

interface Pool {
  liquidity: bigint;
  tokenAddress: Address;
  depositAPR: bigint;
  borrowAPR: bigint;
}

interface UserDeposit {
  tokenAddress: Address;
  amount: bigint;
  pool: Pool;
  timestamp?: number;
}

interface UserBorrow {
  tokenAddress: Address;
  amount: bigint;
  pool: Pool;
  timestamp?: number;
  simulatedInterest?: number;
  totalOwed?: number;
}

interface UserPositions {
  deposits: UserDeposit[];
  borrows: UserBorrow[];
}

interface RepaymentInfo {
  principal: string;
  interest: string;
  total: string;
}

// Token addresses - normalized to lowercase
export const TOKEN_ADDRESSES = {
  USDC: "0xf1815bd50389c46847f0bda824ec8da914045d14" as Address,
  WETH: "0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590" as Address,
  WBTC: "0xa0197b2044d28b08be34d98b23c9312158ea9a18" as Address,
  UNLOO: "0x3084ae7cdb722689a47d41783507878b564f3b67" as Address,
} as const;

// Token metadata lookup with normalized addresses
const TOKEN_METADATA: Record<string, TokenMetadata> = {
  [TOKEN_ADDRESSES.USDC.toLowerCase()]: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    iconColor: "#2775CA",
    imageUrl: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
  },
  [TOKEN_ADDRESSES.WETH.toLowerCase()]: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    iconColor: "#627EEA",
    imageUrl: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
  },
  [TOKEN_ADDRESSES.WBTC.toLowerCase()]: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    iconColor: "#F7931A",
    imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  },
  [TOKEN_ADDRESSES.UNLOO.toLowerCase()]: {
    symbol: "UNLOO",
    name: "Unlloo Protocol",
    decimals: 18,
    iconColor: "#8B5CF6",
    imageUrl:
      "https://fcljjsnuzjacwqgiqiib.supabase.co/storage/v1/object/public/token_images/images/312a9958-4e00-46dc-a699-01f48f0eb4ec.jpg",
  },
} as const;

// Enhanced ERC20 ABI
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Logging utility (replace console.log in production)
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[useLoanMaster] ${message}`, data);
    }
    // TODO: Replace with proper logging service in production
  },
  error: (message: string, error?: any) => {
    console.error(`[useLoanMaster] ${message}`, error);
    // TODO: Replace with proper error tracking service
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[useLoanMaster] ${message}`, data);
    }
  },
};

// Export the utility function to get token metadata
export const getTokenMetadata = (tokenAddress: Address): TokenMetadata => {
  const normalizedAddress = tokenAddress.toLowerCase();
  const metadata = TOKEN_METADATA[normalizedAddress];

  if (metadata) {
    return metadata;
  }

  logger.warn(`No metadata found for token address: ${tokenAddress}`);

  return {
    symbol: "UNK",
    name: "Unknown Token",
    decimals: 18,
    iconColor: "#6B7280",
    imageUrl: "",
  };
};

// Custom hook for error handling
const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, context: string): Error => {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const enhancedError = new Error(`${context}: ${errorMessage}`);

    logger.error(context, error);

    return enhancedError;
  }, []);

  return { handleError };
};

// Custom hook for transaction management
const useTransactionManager = (publicClient: any, walletClient: any) => {
  const executeTransaction = useCallback(
    async (contractCall: () => Promise<any>, context: string) => {
      if (!walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      try {
        const { request } = await contractCall();
        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        logger.info(`${context} transaction successful`, { hash, blockNumber: receipt.blockNumber });

        return receipt;
      } catch (error) {
        throw new Error(`${context} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    },
    [publicClient, walletClient],
  );

  return { executeTransaction };
};

export function useLoanMaster() {
  const { address: userAddress } = useAccount();
  const [pools, setPools] = useState<Pool[]>([]);
  const [userPositions, setUserPositions] = useState<UserPositions>({ deposits: [], borrows: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { handleError } = useErrorHandler();
  const { executeTransaction } = useTransactionManager(publicClient, walletClient);

  const { data: loanMasterContractData } = useDeployedContractInfo({
    contractName: "LoanMaster",
  });

  // Memoized simulated APR lookup
  const displayBorrowAPRs = useMemo(
    () => ({
      [TOKEN_ADDRESSES.USDC]: 1000, // 10%
      [TOKEN_ADDRESSES.WETH]: 800, // 8%
      [TOKEN_ADDRESSES.WBTC]: 900, // 9%
      [TOKEN_ADDRESSES.UNLOO]: 750, // 7.5%
    }),
    [],
  );

  // Simulate interest calculation for frontend display
  const calculateSimulatedInterest = useCallback(
    (principal: number, aprBasisPoints: number, timestamp: number): { interest: number; total: number } => {
      const now = Date.now() / 1000;
      const timeElapsed = now - timestamp;
      const apr = aprBasisPoints / 10000;
      const interest = (principal * apr * timeElapsed) / SECONDS_IN_YEAR;
      const total = principal + interest;

      return { interest, total };
    },
    [],
  );

  // Get simulated APR for display
  const getDisplayBorrowAPR = useCallback(
    (tokenAddress: Address): number => {
      return displayBorrowAPRs[tokenAddress] || 1000;
    },
    [displayBorrowAPRs],
  );

  // Optimized token balance check
  const checkTokenBalance = useCallback(
    async (
      tokenAddress: Address,
      userAddressParam: Address,
      requiredAmount: string,
      decimals: number,
    ): Promise<boolean> => {
      if (!publicClient) return false;

      try {
        const balance = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddressParam],
        })) as bigint;

        const requiredAmountBigInt = parseUnits(requiredAmount, decimals);
        const hasEnough = balance >= requiredAmountBigInt;

        logger.info("Token balance check", {
          token: tokenAddress,
          balance: formatUnits(balance, decimals),
          required: requiredAmount,
          hasEnough,
        });

        return hasEnough;
      } catch (error) {
        logger.error("Error checking token balance", error);
        return false;
      }
    },
    [publicClient],
  );

  // Optimized token allowance check
  const checkTokenAllowance = useCallback(
    async (
      tokenAddress: Address,
      owner: Address,
      spender: Address,
      requiredAmount: string,
      decimals: number,
    ): Promise<boolean> => {
      if (!publicClient) return false;

      try {
        const allowance = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [owner, spender],
        })) as bigint;

        const requiredAmountBigInt = parseUnits(requiredAmount, decimals);
        const hasEnoughAllowance = allowance >= requiredAmountBigInt;

        logger.info("Token allowance check", {
          token: tokenAddress,
          allowance: formatUnits(allowance, decimals),
          required: requiredAmount,
          hasEnoughAllowance,
        });

        return hasEnoughAllowance;
      } catch (error) {
        logger.error("Error checking token allowance", error);
        return false;
      }
    },
    [publicClient],
  );

  // Enhanced approve function
  const approveToken = useCallback(
    async (tokenAddress: Address, spenderAddress: Address, amount: string, decimals: number) => {
      if (!walletClient || !userAddress || !publicClient) {
        throw new Error("Wallet not connected");
      }

      try {
        logger.info("Approving token", { token: tokenAddress, spender: spenderAddress, amount });

        // Check balance first
        const hasBalance = await checkTokenBalance(tokenAddress, userAddress, amount, decimals);
        if (!hasBalance) {
          throw new Error(`Insufficient token balance. Required: ${amount}`);
        }

        const parsedAmount = parseUnits(amount, decimals);

        return await executeTransaction(
          () =>
            publicClient.simulateContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [spenderAddress, parsedAmount],
              account: userAddress,
            }),
          "Token approval",
        );
      } catch (error) {
        throw handleError(error, "Token approval");
      }
    },
    [walletClient, userAddress, publicClient, checkTokenBalance, executeTransaction, handleError],
  );

  // Optimized data refresh function
  const refreshData = useCallback(async () => {
    if (!loanMasterContractData?.address || !publicClient) {
      logger.warn("Missing contract data or public client");
      return;
    }

    try {
      logger.info("Refreshing pools and user positions");

      // Fetch pool count
      const poolCount = (await publicClient.readContract({
        address: loanMasterContractData.address,
        abi: loanMasterContractData.abi,
        functionName: "getLiquidityPoolCount",
      })) as bigint;

      // Fetch all pools in parallel
      const poolPromises = Object.values(TOKEN_ADDRESSES)
        .slice(0, Number(poolCount))
        .map(async tokenAddress => {
          try {
            const poolInfo = (await publicClient.readContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "getLiquidityPoolByToken",
              args: [tokenAddress],
            })) as Pool;

            if (poolInfo) {
              return {
                ...poolInfo,
                borrowAPR: BigInt(getDisplayBorrowAPR(tokenAddress)), // Use simulated APR
              };
            }
            return null;
          } catch (err) {
            logger.error(`Error fetching pool for token ${tokenAddress}`, err);
            return null;
          }
        });

      const poolResults = await Promise.allSettled(poolPromises);
      const poolsData = poolResults
        .filter(
          (result): result is PromiseFulfilledResult<Pool> => result.status === "fulfilled" && result.value !== null,
        )
        .map(result => result.value);

      setPools(poolsData);

      // Fetch user positions if user is connected
      if (userAddress && poolsData.length > 0) {
        const positionPromises = poolsData.map(async pool => {
          try {
            const [depositAmount, borrowAmount] = await Promise.all([
              publicClient.readContract({
                address: loanMasterContractData.address,
                abi: loanMasterContractData.abi,
                functionName: "getUserDeposit",
                args: [pool.tokenAddress, userAddress],
              }) as Promise<bigint>,
              publicClient.readContract({
                address: loanMasterContractData.address,
                abi: loanMasterContractData.abi,
                functionName: "getUserBorrow",
                args: [pool.tokenAddress, userAddress],
              }) as Promise<bigint>,
            ]);

            return {
              deposit:
                depositAmount > 0n
                  ? {
                      tokenAddress: pool.tokenAddress,
                      amount: depositAmount,
                      pool,
                    }
                  : null,
              borrow:
                borrowAmount > 0n
                  ? (() => {
                      const metadata = getTokenMetadata(pool.tokenAddress);
                      const principalFloat = parseFloat(formatUnits(borrowAmount, metadata.decimals));
                      const borrowTimestamp = Date.now() / 1000 - SIMULATION_DAYS * 24 * 60 * 60;
                      const displayAPR = getDisplayBorrowAPR(pool.tokenAddress);
                      const { interest, total } = calculateSimulatedInterest(
                        principalFloat,
                        displayAPR,
                        borrowTimestamp,
                      );

                      return {
                        tokenAddress: pool.tokenAddress,
                        amount: borrowAmount,
                        pool,
                        timestamp: borrowTimestamp,
                        simulatedInterest: interest,
                        totalOwed: total,
                      };
                    })()
                  : null,
            };
          } catch (err) {
            logger.error(`Error fetching user position for token ${pool.tokenAddress}`, err);
            return { deposit: null, borrow: null };
          }
        });

        const positionResults = await Promise.allSettled(positionPromises);
        const positions = positionResults
          .filter((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")
          .map(result => result.value);

        const deposits = positions.map(p => p.deposit).filter(Boolean) as UserDeposit[];
        const borrows = positions.map(p => p.borrow).filter(Boolean) as UserBorrow[];

        setUserPositions({ deposits, borrows });
      }

      logger.info("Data refresh completed", { poolsCount: poolsData.length });
    } catch (error) {
      const errorMessage = handleError(error, "Data refresh");
      setError(errorMessage.message);
    }
  }, [loanMasterContractData, publicClient, userAddress, getDisplayBorrowAPR, calculateSimulatedInterest, handleError]);

  // Initial data fetch with proper error handling
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!loanMasterContractData?.address || !publicClient) {
        logger.info("Waiting for contract data and public client");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await refreshData();
      } catch (error) {
        const errorMessage = handleError(error, "Initial data fetch");
        setError(errorMessage.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [loanMasterContractData, publicClient, refreshData, handleError]);

  // Memoized helper function
  const formatTokenAmount = useCallback((amount: bigint, decimals: number) => {
    return formatUnits(amount, decimals);
  }, []);

  // Optimized liquidity functions
  const addLiquidity = useCallback(
    async (tokenAddress: Address, amount: string, decimals: number) => {
      if (!amount || !userAddress || !loanMasterContractData?.address) {
        throw new Error("Missing required parameters or wallet not connected");
      }

      const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
      if (poolIndex === -1) throw new Error("Pool not found");

      try {
        logger.info("Adding liquidity", { token: tokenAddress, amount });

        // Check balance first
        const hasBalance = await checkTokenBalance(tokenAddress, userAddress, amount, decimals);
        if (!hasBalance) {
          throw new Error(`Insufficient balance for ${amount} tokens`);
        }

        // Approve tokens
        await approveToken(tokenAddress, loanMasterContractData.address, amount, decimals);

        // Add liquidity
        const parsedAmount = parseUnits(amount, decimals);
        await executeTransaction(
          () =>
            publicClient!.simulateContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "addLiquidity",
              args: [BigInt(poolIndex), parsedAmount],
              account: userAddress,
            }),
          "Add liquidity",
        );

        await refreshData();
        logger.info("Liquidity added successfully");
      } catch (error) {
        throw handleError(error, "Add liquidity");
      }
    },
    [
      pools,
      userAddress,
      loanMasterContractData,
      publicClient,
      checkTokenBalance,
      approveToken,
      executeTransaction,
      refreshData,
      handleError,
    ],
  );

  const removeLiquidity = useCallback(
    async (tokenAddress: Address) => {
      if (!userAddress || !loanMasterContractData?.address) {
        throw new Error("Wallet not connected");
      }

      const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
      if (poolIndex === -1) throw new Error("Pool not found");

      try {
        logger.info("Removing liquidity", { token: tokenAddress });

        await executeTransaction(
          () =>
            publicClient!.simulateContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "removeLiquidity",
              args: [BigInt(poolIndex)],
              account: userAddress,
            }),
          "Remove liquidity",
        );

        await refreshData();
        logger.info("Liquidity removed successfully");
      } catch (error) {
        throw handleError(error, "Remove liquidity");
      }
    },
    [pools, userAddress, loanMasterContractData, publicClient, executeTransaction, refreshData, handleError],
  );

  const borrow = useCallback(
    async (tokenAddress: Address, amount: string, decimals: number) => {
      if (!amount || !userAddress || !loanMasterContractData?.address) {
        throw new Error("Missing required parameters or wallet not connected");
      }

      const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
      if (poolIndex === -1) throw new Error("Pool not found");

      try {
        logger.info("Borrowing", { token: tokenAddress, amount });

        const parsedAmount = parseUnits(amount, decimals);
        await executeTransaction(
          () =>
            publicClient!.simulateContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "borrow",
              args: [BigInt(poolIndex), parsedAmount],
              account: userAddress,
            }),
          "Borrow",
        );

        await refreshData();
        logger.info("Borrow successful");
      } catch (error) {
        throw handleError(error, "Borrow");
      }
    },
    [pools, userAddress, loanMasterContractData, publicClient, executeTransaction, refreshData, handleError],
  );

  const repayBorrow = useCallback(
    async (tokenAddress: Address) => {
      if (!userAddress || !loanMasterContractData?.address) {
        throw new Error("Wallet not connected");
      }

      try {
        logger.info("Repaying borrow (principal only)", { token: tokenAddress });

        // Get exact borrowed amount
        const borrowedAmount = (await publicClient!.readContract({
          address: loanMasterContractData.address,
          abi: loanMasterContractData.abi,
          functionName: "getUserBorrow",
          args: [tokenAddress, userAddress],
        })) as bigint;

        if (borrowedAmount === 0n) {
          throw new Error("No active borrow to repay");
        }

        const metadata = getTokenMetadata(tokenAddress);
        const repayAmountString = formatUnits(borrowedAmount, metadata.decimals);

        logger.info(`Repaying exactly: ${repayAmountString} ${metadata.symbol} (principal only)`);

        // Check balance
        const hasBalance = await checkTokenBalance(tokenAddress, userAddress, repayAmountString, metadata.decimals);
        if (!hasBalance) {
          throw new Error(`Insufficient balance. Need exactly: ${repayAmountString} ${metadata.symbol}`);
        }

        // Approve exact amount
        await approveToken(tokenAddress, loanMasterContractData.address, repayAmountString, metadata.decimals);

        // Repay
        await executeTransaction(
          () =>
            publicClient!.simulateContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "repayBorrow",
              args: [tokenAddress],
              account: userAddress,
            }),
          "Repay borrow",
        );

        await refreshData();
        logger.info("Repayment successful");
      } catch (error) {
        throw handleError(error, "Repay borrow");
      }
    },
    [
      userAddress,
      loanMasterContractData,
      publicClient,
      checkTokenBalance,
      approveToken,
      executeTransaction,
      refreshData,
      handleError,
    ],
  );

  // Memoized repayment calculations
  const getDisplayRepaymentAmount = useCallback(
    (tokenAddress: Address): RepaymentInfo => {
      const userBorrow = userPositions.borrows.find(b => b.tokenAddress === tokenAddress);
      if (!userBorrow) {
        return { principal: "0", interest: "0", total: "0" };
      }

      const metadata = getTokenMetadata(tokenAddress);
      const principal = parseFloat(formatUnits(userBorrow.amount, metadata.decimals));
      const interest = userBorrow.simulatedInterest || 0;
      const total = userBorrow.totalOwed || principal;

      return {
        principal: principal.toFixed(6),
        interest: interest.toFixed(6),
        total: total.toFixed(6),
      };
    },
    [userPositions.borrows],
  );

  const getActualRepaymentAmount = useCallback(
    async (tokenAddress: Address): Promise<string> => {
      if (!userAddress || !loanMasterContractData?.address || !publicClient) {
        return "0";
      }

      try {
        const amount = (await publicClient.readContract({
          address: loanMasterContractData.address,
          abi: loanMasterContractData.abi,
          functionName: "getUserBorrow",
          args: [tokenAddress, userAddress],
        })) as bigint;

        const metadata = getTokenMetadata(tokenAddress);
        return formatUnits(amount, metadata.decimals);
      } catch (error) {
        logger.error("Error getting actual repayment amount", error);
        return "0";
      }
    },
    [userAddress, loanMasterContractData, publicClient],
  );

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      pools,
      userPositions,
      isLoading,
      error,
      addLiquidity,
      removeLiquidity,
      borrow,
      repayBorrow,
      formatTokenAmount,
      refreshData,
      TOKEN_ADDRESSES,
      checkTokenBalance,
      checkTokenAllowance,
      getDisplayRepaymentAmount,
      getActualRepaymentAmount,
      calculateSimulatedInterest,
    }),
    [
      pools,
      userPositions,
      isLoading,
      error,
      addLiquidity,
      removeLiquidity,
      borrow,
      repayBorrow,
      formatTokenAmount,
      refreshData,
      checkTokenBalance,
      checkTokenAllowance,
      getDisplayRepaymentAmount,
      getActualRepaymentAmount,
      calculateSimulatedInterest,
    ],
  );
}
