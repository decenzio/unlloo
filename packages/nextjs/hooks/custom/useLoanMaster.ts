import { useCallback, useEffect, useState } from "react";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

// Token addresses - you would replace these with actual deployed token addresses
export const TOKEN_ADDRESSES = {
  USDC: "0xF1815bd50389c46847f0Bda824eC8da914045D14" as Address,
  WETH: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590" as Address,
  WBTC: "0xA0197b2044D28b08Be34d98b23c9312158Ea9A18" as Address,
};

// Interface for token metadata
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  iconColor: string;
  imageUrl: string;
}

// Token metadata lookup with images
const TOKEN_METADATA: Record<Address, TokenMetadata> = {
  [TOKEN_ADDRESSES.USDC]: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    iconColor: "#2775CA",
    imageUrl: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
  },
  [TOKEN_ADDRESSES.WETH]: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    iconColor: "#627EEA",
    imageUrl: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
  },
  [TOKEN_ADDRESSES.WBTC]: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    iconColor: "#F7931A",
    imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  },
};

// Export the utility function to get token metadata
export const getTokenMetadata = (tokenAddress: Address): TokenMetadata => {
  return (
    TOKEN_METADATA[tokenAddress] || {
      symbol: "UNK",
      name: "Unknown Token",
      decimals: 18,
      iconColor: "#6B7280",
      imageUrl: "",
    }
  );
};

// Pool data structure from contract
interface Pool {
  liquidity: bigint;
  tokenAddress: Address;
  depositAPR: bigint;
  borrowAPR: bigint;
}

// User position data structures with simulated interest
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
  simulatedInterest?: number; // For frontend display only
  totalOwed?: number; // Principal + simulated interest for display
}

interface UserPositions {
  deposits: UserDeposit[];
  borrows: UserBorrow[];
}

// Enhanced ERC20 ABI with balance and allowance functions
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

export function useLoanMaster() {
  const { address: userAddress } = useAccount();
  const [pools, setPools] = useState<Pool[]>([]);
  const [userPositions, setUserPositions] = useState<UserPositions>({ deposits: [], borrows: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get clients from wagmi
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Get the LoanMaster contract info
  const { data: loanMasterContractData } = useDeployedContractInfo("LoanMaster");

  // Simulate interest calculation for frontend display
  const calculateSimulatedInterest = useCallback(
    (principal: number, aprBasisPoints: number, timestamp: number): { interest: number; total: number } => {
      const now = Date.now() / 1000; // Current time in seconds
      const timeElapsed = now - timestamp;
      const secondsInYear = 365 * 24 * 60 * 60;

      // Convert basis points to percentage (e.g., 1000 = 10%)
      const apr = aprBasisPoints / 10000;

      // Calculate simple interest for display
      const interest = (principal * apr * timeElapsed) / secondsInYear;
      const total = principal + interest;

      return { interest, total };
    },
    [],
  );

  // Get simulated APR for display (since contract has 0% borrow APR)
  const getDisplayBorrowAPR = useCallback((tokenAddress: Address): number => {
    // Return simulated APRs for frontend display
    const simulatedAPRs: Record<Address, number> = {
      [TOKEN_ADDRESSES.USDC]: 1000, // 10%
      [TOKEN_ADDRESSES.WETH]: 800, // 8%
      [TOKEN_ADDRESSES.WBTC]: 900, // 9%
    };
    return simulatedAPRs[tokenAddress] || 1000;
  }, []);

  // Helper function to check token balance
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

        console.log(`Token Balance Check:`, {
          token: tokenAddress,
          balance: formatUnits(balance, decimals),
          required: requiredAmount,
          hasEnough,
        });

        return hasEnough;
      } catch (error) {
        console.error("Error checking token balance:", error);
        return false;
      }
    },
    [publicClient],
  );

  // Helper function to check token allowance
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

        console.log(`Token Allowance Check:`, {
          token: tokenAddress,
          allowance: formatUnits(allowance, decimals),
          required: requiredAmount,
          hasEnoughAllowance,
        });

        return hasEnoughAllowance;
      } catch (error) {
        console.error("Error checking token allowance:", error);
        return false;
      }
    },
    [publicClient],
  );

  // Enhanced approve function with better error handling
  const approveToken = useCallback(
    async (tokenAddress: Address, spenderAddress: Address, amount: string, decimals: number) => {
      if (!walletClient || !userAddress || !publicClient) {
        throw new Error("Wallet not connected");
      }

      try {
        console.log(`=== Approving Token ===`);
        console.log(`Token: ${tokenAddress}`);
        console.log(`Spender: ${spenderAddress}`);
        console.log(`Amount: ${amount}`);

        // Check if user has enough balance
        const hasBalance = await checkTokenBalance(tokenAddress, userAddress, amount, decimals);
        if (!hasBalance) {
          throw new Error(`Insufficient token balance. Required: ${amount}`);
        }

        const parsedAmount = parseUnits(amount, decimals);
        console.log(`Parsed amount: ${parsedAmount.toString()}`);

        const { request } = await publicClient.simulateContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spenderAddress, parsedAmount],
          account: userAddress,
        });

        const hash = await walletClient.writeContract(request);
        console.log(`Approval transaction hash: ${hash}`);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`Approval confirmed in block: ${receipt.blockNumber}`);

        return receipt;
      } catch (error) {
        console.error("Token approval failed:", error);
        throw new Error(`Token approval failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    },
    [walletClient, userAddress, publicClient, checkTokenBalance],
  );

  // Refresh data function
  const refreshData = useCallback(async () => {
    if (!loanMasterContractData?.address || !publicClient) return;

    try {
      // Refetch pools
      const poolCount = (await publicClient.readContract({
        address: loanMasterContractData.address,
        abi: loanMasterContractData.abi,
        functionName: "getLiquidityPoolCount",
      })) as bigint;

      const poolsData: Pool[] = [];
      for (let i = 0; i < Number(poolCount); i++) {
        try {
          const tokenAddress = Object.values(TOKEN_ADDRESSES)[i % Object.keys(TOKEN_ADDRESSES).length];
          const poolInfo = (await publicClient.readContract({
            address: loanMasterContractData.address,
            abi: loanMasterContractData.abi,
            functionName: "getLiquidityPoolByToken",
            args: [tokenAddress],
          })) as {
            liquidity: bigint;
            tokenAddress: Address;
            depositAPR: bigint;
            borrowAPR: bigint;
          };

          if (poolInfo) {
            // Override the borrowAPR for display purposes
            poolsData.push({
              liquidity: poolInfo.liquidity,
              tokenAddress: poolInfo.tokenAddress,
              depositAPR: poolInfo.depositAPR,
              borrowAPR: BigInt(getDisplayBorrowAPR(tokenAddress)), // Use simulated APR
            });
          }
        } catch (err) {
          console.error(`Error fetching pool ${i}:`, err);
        }
      }

      setPools(poolsData);

      // Refetch user positions if user is connected
      if (userAddress && poolsData.length > 0) {
        const deposits: UserDeposit[] = [];
        const borrows: UserBorrow[] = [];

        for (const pool of poolsData) {
          try {
            const depositAmount = (await publicClient.readContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "getUserDeposit",
              args: [pool.tokenAddress, userAddress],
            })) as bigint;

            if (depositAmount > 0n) {
              deposits.push({
                tokenAddress: pool.tokenAddress,
                amount: depositAmount,
                pool,
              });
            }

            const borrowAmount = (await publicClient.readContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "getUserBorrow",
              args: [pool.tokenAddress, userAddress],
            })) as bigint;

            if (borrowAmount > 0n) {
              const metadata = getTokenMetadata(pool.tokenAddress);
              const principalFloat = parseFloat(formatUnits(borrowAmount, metadata.decimals));

              // Simulate interest calculation for display
              const borrowTimestamp = Date.now() / 1000 - 7 * 24 * 60 * 60; // Simulate 7 days ago
              const displayAPR = getDisplayBorrowAPR(pool.tokenAddress);
              const { interest, total } = calculateSimulatedInterest(principalFloat, displayAPR, borrowTimestamp);

              borrows.push({
                tokenAddress: pool.tokenAddress,
                amount: borrowAmount,
                pool,
                timestamp: borrowTimestamp,
                simulatedInterest: interest,
                totalOwed: total,
              });
            }
          } catch (err) {
            console.error(`Error fetching user position for token ${pool.tokenAddress}:`, err);
          }
        }

        setUserPositions({ deposits, borrows });
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }, [loanMasterContractData, publicClient, userAddress, getDisplayBorrowAPR, calculateSimulatedInterest]);

  // Find this useEffect around line 386 and update it:
  useEffect(() => {
    const fetchPools = async () => {
      if (!loanMasterContractData?.address || !publicClient) return;

      setIsLoading(true);
      setError(null);

      try {
        await refreshData();
      } catch (error) {
        console.error("Error loading pools:", error);
        setError(error instanceof Error ? error.message : "Failed to load pools");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPools();
  }, [loanMasterContractData, publicClient, refreshData]);

  // Helper function to format token amounts
  const formatTokenAmount = useCallback((amount: bigint, decimals: number) => {
    return formatUnits(amount, decimals);
  }, []);

  // Function to add liquidity to a pool
  const addLiquidity = useCallback(
    async (tokenAddress: Address, amount: string, decimals: number) => {
      if (!amount || !userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) {
        throw new Error("Missing required parameters or wallet not connected");
      }

      const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
      if (poolIndex === -1) throw new Error("Pool not found");

      try {
        console.log(`=== Adding Liquidity ===`);
        console.log(`Token: ${tokenAddress}, Amount: ${amount}`);

        // Check balance first
        const hasBalance = await checkTokenBalance(tokenAddress, userAddress, amount, decimals);
        if (!hasBalance) {
          throw new Error(`Insufficient balance for ${amount} tokens`);
        }

        // Approve tokens
        await approveToken(tokenAddress, loanMasterContractData.address, amount, decimals);

        // Add liquidity
        const parsedAmount = parseUnits(amount, decimals);
        const { request } = await publicClient.simulateContract({
          address: loanMasterContractData.address,
          abi: loanMasterContractData.abi,
          functionName: "addLiquidity",
          args: [BigInt(poolIndex), parsedAmount],
          account: userAddress,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        console.log("Liquidity added successfully!");

        // Refresh data after successful transaction
        await refreshData();
      } catch (error) {
        console.error("Error adding liquidity:", error);
        throw error;
      }
    },
    [
      pools,
      userAddress,
      loanMasterContractData,
      walletClient,
      publicClient,
      checkTokenBalance,
      approveToken,
      refreshData,
    ],
  );

  // Function to remove liquidity from a pool
  const removeLiquidity = useCallback(
    async (tokenAddress: Address) => {
      if (!userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
      if (poolIndex === -1) throw new Error("Pool not found");

      try {
        console.log(`=== Removing Liquidity ===`);
        console.log(`Token: ${tokenAddress}`);

        const { request } = await publicClient.simulateContract({
          address: loanMasterContractData.address,
          abi: loanMasterContractData.abi,
          functionName: "removeLiquidity",
          args: [BigInt(poolIndex)],
          account: userAddress,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        console.log("Liquidity removed successfully!");

        // Refresh data after successful transaction
        await refreshData();
      } catch (error) {
        console.error("Error removing liquidity:", error);
        throw error;
      }
    },
    [pools, userAddress, loanMasterContractData, walletClient, publicClient, refreshData],
  );

  // Function to borrow from a pool
  const borrow = useCallback(
    async (tokenAddress: Address, amount: string, decimals: number) => {
      if (!amount || !userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) {
        throw new Error("Missing required parameters or wallet not connected");
      }

      const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
      if (poolIndex === -1) throw new Error("Pool not found");

      try {
        console.log(`=== Borrowing ===`);
        console.log(`Token: ${tokenAddress}, Amount: ${amount}`);

        const parsedAmount = parseUnits(amount, decimals);
        const { request } = await publicClient.simulateContract({
          address: loanMasterContractData.address,
          abi: loanMasterContractData.abi,
          functionName: "borrow",
          args: [BigInt(poolIndex), parsedAmount],
          account: userAddress,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        console.log("Borrow successful!");

        // Refresh data after successful transaction
        await refreshData();
      } catch (error) {
        console.error("Error borrowing:", error);
        throw error;
      }
    },
    [pools, userAddress, loanMasterContractData, walletClient, publicClient, refreshData],
  );

  // Simplified repay function - only repays principal amount
  const repayBorrow = useCallback(
    async (tokenAddress: Address) => {
      if (!userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      try {
        console.log("=== Repaying Borrow (Principal Only) ===");
        console.log("Token Address:", tokenAddress);

        // Get exact borrowed amount (principal only)
        const borrowedAmount = (await publicClient.readContract({
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

        console.log(`Repaying exactly: ${repayAmountString} ${metadata.symbol} (principal only)`);

        // Check balance
        const hasBalance = await checkTokenBalance(tokenAddress, userAddress, repayAmountString, metadata.decimals);
        if (!hasBalance) {
          throw new Error(`Insufficient balance. Need exactly: ${repayAmountString} ${metadata.symbol}`);
        }

        // Approve exact amount
        await approveToken(tokenAddress, loanMasterContractData.address, repayAmountString, metadata.decimals);

        // Repay
        const { request } = await publicClient.simulateContract({
          address: loanMasterContractData.address,
          abi: loanMasterContractData.abi,
          functionName: "repayBorrow",
          args: [tokenAddress],
          account: userAddress,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        console.log("Repayment successful!");
        await refreshData();
      } catch (error) {
        console.error("Error repaying borrow:", error);
        throw error;
      }
    },
    [userAddress, loanMasterContractData, walletClient, publicClient, checkTokenBalance, approveToken, refreshData],
  );

  // Get repayment amount for display (includes simulated interest)
  const getDisplayRepaymentAmount = useCallback(
    (tokenAddress: Address): { principal: string; interest: string; total: string } => {
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

  // Get actual repayment amount (only principal)
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
        console.error("Error getting actual repayment amount:", error);
        return "0";
      }
    },
    [userAddress, loanMasterContractData, publicClient],
  );

  return {
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
  };
}
