import { useEffect, useState } from "react";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

// Token addresses - you would replace these with actual deployed token addresses
export const TOKEN_ADDRESSES = {
  USDC: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as Address, // Example address
  WETH: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" as Address, // Example address
  WBTC: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" as Address, // Example address
};

// Interface for token metadata
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  iconColor: string;
}

// Token metadata lookup
const TOKEN_METADATA: Record<Address, TokenMetadata> = {
  [TOKEN_ADDRESSES.USDC]: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    iconColor: "#2775CA",
  },
  [TOKEN_ADDRESSES.WETH]: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    iconColor: "#627EEA",
  },
  [TOKEN_ADDRESSES.WBTC]: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    iconColor: "#F7931A",
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

// User position data structures
interface UserDeposit {
  tokenAddress: Address;
  amount: bigint;
  pool: Pool;
}

interface UserBorrow {
  tokenAddress: Address;
  amount: bigint;
  pool: Pool;
}

interface UserPositions {
  deposits: UserDeposit[];
  borrows: UserBorrow[];
}

// Simple ERC20 ABI for the approve function
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
] as const;

export function useLoanMaster() {
  const { address: userAddress } = useAccount();
  const [pools, setPools] = useState<Pool[]>([]);
  const [userPositions, setUserPositions] = useState<UserPositions>({ deposits: [], borrows: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Get clients from wagmi
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Get the LoanMaster contract info
  const { data: loanMasterContractData } = useDeployedContractInfo("LoanMaster");

  // Helper function to approve tokens
  const approveToken = async (tokenAddress: Address, spenderAddress: Address, amount: string, decimals: number) => {
    if (!walletClient || !userAddress) throw new Error("Wallet not connected");

    const parsedAmount = parseUnits(amount, decimals);

    const { request } = await publicClient.simulateContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, parsedAmount],
      account: userAddress,
    });

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    console.log(`Approved ${amount} tokens for ${spenderAddress}`);
  };

  // Load all pools from the contract
  useEffect(() => {
    const fetchPools = async () => {
      if (!loanMasterContractData?.address || !publicClient) return;

      try {
        // Get pool count
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
            })) as any;

            if (poolInfo) {
              poolsData.push({
                liquidity: poolInfo.liquidity,
                tokenAddress: poolInfo.tokenAddress,
                depositAPR: poolInfo.depositAPR,
                borrowAPR: poolInfo.borrowAPR,
              });
            }
          } catch (err) {
            console.error(`Error fetching pool ${i}:`, err);
          }
        }

        setPools(poolsData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading pools:", error);
        setIsLoading(false);
      }
    };

    fetchPools();
  }, [loanMasterContractData, publicClient]);

  // Load user positions (deposits and borrows)
  useEffect(() => {
    const fetchUserPositions = async () => {
      if (!loanMasterContractData?.address || !publicClient || !userAddress || pools.length === 0) return;

      try {
        const deposits: UserDeposit[] = [];
        const borrows: UserBorrow[] = [];

        for (const pool of pools) {
          try {
            // Get user deposit for this token
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

            // Get user borrow for this token
            const borrowAmount = (await publicClient.readContract({
              address: loanMasterContractData.address,
              abi: loanMasterContractData.abi,
              functionName: "getUserBorrow",
              args: [pool.tokenAddress, userAddress],
            })) as bigint;

            if (borrowAmount > 0n) {
              borrows.push({
                tokenAddress: pool.tokenAddress,
                amount: borrowAmount,
                pool,
              });
            }
          } catch (err) {
            console.error(`Error fetching user position for token ${pool.tokenAddress}:`, err);
          }
        }

        setUserPositions({ deposits, borrows });
      } catch (error) {
        console.error("Error loading user positions:", error);
      }
    };

    fetchUserPositions();
  }, [loanMasterContractData, publicClient, userAddress, pools]);

  // Helper function to format token amounts
  const formatTokenAmount = (amount: bigint, decimals: number) => {
    return formatUnits(amount, decimals);
  };

  // Function to add liquidity to a pool
  const addLiquidity = async (tokenAddress: Address, amount: string, decimals: number) => {
    if (!amount || !userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) return;

    // Find the pool index
    const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
    if (poolIndex === -1) throw new Error("Pool not found");

    try {
      // First, approve the token transfer
      await approveToken(tokenAddress, loanMasterContractData.address, amount, decimals);

      // Then add liquidity
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
    } catch (error) {
      console.error("Error adding liquidity:", error);
      throw error;
    }
  };

  // Function to remove liquidity from a pool
  const removeLiquidity = async (tokenAddress: Address) => {
    if (!userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) return;

    // Find the pool index
    const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
    if (poolIndex === -1) throw new Error("Pool not found");

    try {
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
    } catch (error) {
      console.error("Error removing liquidity:", error);
      throw error;
    }
  };

  // Function to borrow from a pool
  const borrow = async (tokenAddress: Address, amount: string, decimals: number) => {
    if (!amount || !userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) return;

    // Find the pool index
    const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
    if (poolIndex === -1) throw new Error("Pool not found");

    try {
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
    } catch (error) {
      console.error("Error borrowing:", error);
      throw error;
    }
  };

  // Function to repay a borrow
  const repayBorrow = async (tokenAddress: Address) => {
    if (!userAddress || !loanMasterContractData?.address || !walletClient || !publicClient) return;

    // Find the pool index
    const poolIndex = pools.findIndex(pool => pool.tokenAddress === tokenAddress);
    if (poolIndex === -1) throw new Error("Pool not found");

    try {
      // Get the borrow amount plus interest
      const userBorrow = userPositions.borrows.find(b => b.tokenAddress === tokenAddress);
      if (!userBorrow) throw new Error("No borrow found for this token");

      // Calculate repayment amount (principal + interest)
      const metadata = getTokenMetadata(tokenAddress);
      const borrowAmount = formatUnits(userBorrow.amount, metadata.decimals);

      // Add 10% extra for interest as a simple estimate
      const totalAmountWithInterest = (parseFloat(borrowAmount) * 1.1).toString();

      // First approve the token transfer
      await approveToken(tokenAddress, loanMasterContractData.address, totalAmountWithInterest, metadata.decimals);

      // Then repay the borrow
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
    } catch (error) {
      console.error("Error repaying borrow:", error);
      throw error;
    }
  };

  return {
    pools,
    userPositions,
    isLoading,
    addLiquidity,
    removeLiquidity,
    borrow,
    repayBorrow,
    formatTokenAmount,
    TOKEN_ADDRESSES,
  };
}
