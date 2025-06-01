"use client";

import { useEffect, useMemo, useState } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { CryptoIcon } from "~~/components/custom/cryptoIcon";
import { TOKEN_ADDRESSES, getTokenMetadata, useLoanMaster } from "~~/hooks/custom/useLoanMaster";
import { notification } from "~~/utils/scaffold-eth";

// Remove the inline CryptoIcon component definition here

const EarnPage = () => {
  const { address: connectedAddress } = useAccount();
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<Address>(TOKEN_ADDRESSES.USDC);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Get data from the hook
  const { pools, userPositions, isLoading, error, addLiquidity, removeLiquidity, formatTokenAmount, refreshData } =
    useLoanMaster();

  console.log(`[EarnPage] Hook data:`, {
    poolsLength: pools.length,
    userDepositsLength: userPositions.deposits.length,
    isLoading,
    error,
    selectedPoolAddress,
  });

  // Transform pools for UI
  const availablePools = useMemo(() => {
    console.log(`[EarnPage] Transforming pools:`, pools);

    return pools.map(pool => {
      const metadata = getTokenMetadata(pool.tokenAddress);
      const liquidityFormatted = parseFloat(formatTokenAmount(pool.liquidity, metadata.decimals));
      const depositAPR = Number(pool.depositAPR) / 100; // Convert from basis points

      console.log(`[EarnPage] Pool ${metadata.symbol}:`, {
        address: pool.tokenAddress,
        liquidity: liquidityFormatted,
        depositAPR,
        metadata,
      });

      return {
        id: metadata.symbol,
        name: `${metadata.name} Pool`,
        address: pool.tokenAddress,
        symbol: metadata.symbol,
        iconColor: metadata.iconColor,
        imageUrl: metadata.imageUrl,
        decimals: metadata.decimals,
        liquidity: liquidityFormatted,
        depositAPR,
        totalLiquidity: liquidityFormatted,
      };
    });
  }, [pools, formatTokenAmount]);

  // Get selected pool data
  const selectedPool = useMemo(() => {
    const pool = availablePools.find(p => p.address === selectedPoolAddress);
    console.log(`[EarnPage] Selected pool:`, pool);
    return pool;
  }, [availablePools, selectedPoolAddress]);

  // Calculate user stats for selected pool
  const userStats = useMemo(() => {
    console.log(`[EarnPage] Calculating user stats for:`, selectedPoolAddress);
    console.log(`[EarnPage] User deposits:`, userPositions.deposits);

    const userDeposit = userPositions.deposits.find(d => d.tokenAddress === selectedPoolAddress);

    if (!userDeposit || !selectedPool) {
      console.log(`[EarnPage] No user deposit found for selected pool`);
      return {
        deposited: "0.0",
        earned: "0.0",
        apy: selectedPool?.depositAPR.toFixed(2) || "0.0",
      };
    }

    const metadata = getTokenMetadata(userDeposit.tokenAddress);
    const depositedAmount = parseFloat(formatTokenAmount(userDeposit.amount, metadata.decimals));

    // Calculate simulated earnings (for display purposes)
    // In a real implementation, this would come from the contract
    const timeDeposited = 30; // Assume 30 days for demo
    const dailyRate = selectedPool.depositAPR / 365 / 100;
    const earnedAmount = depositedAmount * dailyRate * timeDeposited;

    const stats = {
      deposited: depositedAmount.toFixed(6),
      earned: earnedAmount.toFixed(6),
      apy: selectedPool.depositAPR.toFixed(2),
    };

    console.log(`[EarnPage] Calculated user stats:`, stats);
    return stats;
  }, [userPositions.deposits, selectedPoolAddress, selectedPool, formatTokenAmount]);

  // Calculate pool statistics
  const poolStats = useMemo(() => {
    if (!selectedPool) {
      return {
        totalLiquidity: "0.0",
        activeLoans: "0",
        averageAPY: "0.0",
      };
    }

    // Count active loans across all pools (simplified)
    const activeLoans = userPositions.borrows.length;

    const stats = {
      totalLiquidity: selectedPool.totalLiquidity.toFixed(2),
      activeLoans: activeLoans.toString(),
      averageAPY: selectedPool.depositAPR.toFixed(2),
    };

    console.log(`[EarnPage] Pool stats:`, stats);
    return stats;
  }, [selectedPool, userPositions.borrows]);

  // Handle pool selection change
  const handlePoolChange = (poolAddress: Address) => {
    console.log(`[EarnPage] Switching to pool:`, poolAddress);
    setSelectedPoolAddress(poolAddress);
    setDepositAmount("");
    setWithdrawAmount("");
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!depositAmount || !selectedPool || !connectedAddress) {
      console.log(`[EarnPage] Deposit validation failed:`, {
        depositAmount,
        selectedPool: !!selectedPool,
        connectedAddress: !!connectedAddress,
      });
      return;
    }

    setIsDepositing(true);
    try {
      console.log(`[EarnPage] Starting deposit:`, {
        tokenAddress: selectedPool.address,
        amount: depositAmount,
        decimals: selectedPool.decimals,
      });

      await addLiquidity(selectedPool.address, depositAmount, selectedPool.decimals);

      notification.success(`Successfully deposited ${depositAmount} ${selectedPool.symbol}!`);
      setDepositAmount("");

      // Refresh data
      await refreshData();
    } catch (error) {
      console.error("[EarnPage] Deposit failed:", error);
      notification.error(`Deposit failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedPool || !connectedAddress) {
      console.log(`[EarnPage] Withdraw validation failed:`, {
        withdrawAmount,
        selectedPool: !!selectedPool,
        connectedAddress: !!connectedAddress,
      });
      return;
    }

    // Check if user has enough deposited
    const userDeposit = userPositions.deposits.find(d => d.tokenAddress === selectedPool.address);
    if (!userDeposit) {
      notification.error("No deposits found for this pool");
      return;
    }

    const depositedAmount = parseFloat(formatTokenAmount(userDeposit.amount, selectedPool.decimals));
    if (parseFloat(withdrawAmount) > depositedAmount) {
      notification.error(`Cannot withdraw more than deposited (${depositedAmount.toFixed(6)} ${selectedPool.symbol})`);
      return;
    }

    setIsWithdrawing(true);
    try {
      console.log(`[EarnPage] Starting withdrawal:`, {
        tokenAddress: selectedPool.address,
        amount: withdrawAmount,
      });

      // For full withdrawal, use removeLiquidity
      if (parseFloat(withdrawAmount) >= depositedAmount * 0.99) {
        // Allow for small rounding differences
        await removeLiquidity(selectedPool.address);
        notification.success(`Successfully withdrew all ${selectedPool.symbol}!`);
      } else {
        // For partial withdrawal, you'd need a separate function in your contract
        notification.error("Partial withdrawals not yet supported. Please withdraw full amount.");
        return;
      }

      setWithdrawAmount("");

      // Refresh data
      await refreshData();
    } catch (error) {
      console.error("[EarnPage] Withdraw failed:", error);
      notification.error(`Withdraw failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Handle max deposit amount
  const handleMaxDeposit = () => {
    if (selectedPool) {
      // In a real app, you'd check the user's token balance
      // For now, set a reasonable max based on pool liquidity
      const maxAmount = Math.min(1000, selectedPool.totalLiquidity * 0.1).toFixed(6);
      setDepositAmount(maxAmount);
    }
  };

  // Handle max withdraw amount
  const handleMaxWithdraw = () => {
    if (selectedPool) {
      const userDeposit = userPositions.deposits.find(d => d.tokenAddress === selectedPool.address);
      if (userDeposit) {
        const maxAmount = formatTokenAmount(userDeposit.amount, selectedPool.decimals);
        setWithdrawAmount(maxAmount);
      }
    }
  };

  // Auto-select first pool when pools are loaded
  useEffect(() => {
    if (availablePools.length > 0 && !selectedPool) {
      console.log(`[EarnPage] Auto-selecting first pool:`, availablePools[0].address);
      setSelectedPoolAddress(availablePools[0].address);
    }
  }, [availablePools, selectedPool]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="flex items-center justify-center py-20">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-4 text-lg">Loading pool data...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="alert alert-error">
          <span>Error loading pool data: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-5xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Earn by Providing Liquidity</h1>
      <p className="text-xl mb-10 text-center text-gray-400">
        Provide liquidity to the uncollateralized lending pool and earn interest from reputation-based loans
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-purple-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-purple-700">Total Liquidity</h2>
          <p className="text-4xl font-bold text-purple-700">
            {poolStats.totalLiquidity} {selectedPool?.symbol || "ETH"}
          </p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-green-700">Active Loans</h2>
          <p className="text-4xl font-bold text-green-700">{poolStats.activeLoans}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-yellow-700">Deposit APY</h2>
          <p className="text-4xl font-bold text-yellow-700">{poolStats.averageAPY}%</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-12">
        <div className="bg-base-100 p-8 rounded-lg shadow-lg border border-base-300 w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-6 text-center">Provide Liquidity</h2>

          {connectedAddress ? (
            <>
              {/* User Stats */}
              <div className="mb-8 w-full flex flex-col items-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                  <div className="bg-base-200 rounded-lg shadow flex flex-col items-center py-2 px-1">
                    <p className="text-sm text-gray-400 mb-0">Deposited</p>
                    <p className="text-xl font-bold mt-0">
                      {userStats.deposited} {selectedPool?.symbol || "ETH"}
                    </p>
                  </div>
                  <div className="bg-base-200 rounded-lg shadow flex flex-col items-center py-2 px-1">
                    <p className="text-sm text-gray-400 mb-0">Earned</p>
                    <p className="text-xl font-bold text-green-500 mt-0">
                      +{userStats.earned} {selectedPool?.symbol || "ETH"}
                    </p>
                  </div>
                  <div className="bg-base-200 rounded-lg shadow flex flex-col items-center py-2 px-1">
                    <p className="text-sm text-gray-400 mb-0">Current APY</p>
                    <p className="text-xl font-bold mt-0">{userStats.apy}%</p>
                  </div>
                </div>
              </div>

              {/* Pool Selection */}
              <div className="mb-8 w-full flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 text-center">Select Liquidity Pool</h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {availablePools.map(pool => (
                    <button
                      key={pool.address}
                      className={`btn btn-sm flex items-center gap-2 ${
                        selectedPoolAddress === pool.address ? "btn-primary" : "btn-outline"
                      }`}
                      onClick={() => handlePoolChange(pool.address)}
                    >
                      <CryptoIcon symbol={pool.symbol} color={pool.iconColor} imageUrl={pool.imageUrl} size={20} />
                      {pool.name}
                    </button>
                  ))}
                </div>
                {selectedPool && (
                  <div className="mt-3 text-sm text-gray-400 text-center">
                    Selected pool: {selectedPool.name} | APY: {selectedPool.depositAPR.toFixed(2)}% | Liquidity:{" "}
                    {selectedPool.totalLiquidity.toFixed(2)} {selectedPool.symbol}
                  </div>
                )}
              </div>

              {/* Deposit and Withdraw Forms */}
              {selectedPool && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
                  {/* Deposit Form */}
                  <div className="bg-base-300 p-6 rounded-lg shadow-lg flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-2 text-center">Deposit</h3>
                    <div className="flex items-center mb-4 w-full">
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        className="input input-bordered flex-1 mr-2"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                      />
                      <div className="flex items-center gap-1">
                        <CryptoIcon
                          symbol={selectedPool.symbol}
                          color={selectedPool.iconColor}
                          imageUrl={selectedPool.imageUrl}
                          size={20}
                        />
                        <span className="text-lg font-bold">{selectedPool.symbol}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4 w-full">
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary-focus"
                        onClick={handleMaxDeposit}
                      >
                        MAX
                      </button>
                    </div>
                    <button
                      className="bg-purple-200 btn btn-primary w-full"
                      onClick={handleDeposit}
                      disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
                    >
                      {isDepositing ? "Depositing..." : "Deposit to Earn"}
                    </button>
                  </div>

                  {/* Withdraw Form */}
                  <div className="bg-base-300 p-6 rounded-lg shadow-lg flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-2 text-center">Withdraw</h3>
                    <div className="flex items-center mb-4 w-full">
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        className="input input-bordered flex-1 mr-2"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                      />
                      <div className="flex items-center gap-1">
                        <CryptoIcon
                          symbol={selectedPool.symbol}
                          color={selectedPool.iconColor}
                          imageUrl={selectedPool.imageUrl}
                          size={20}
                        />
                        <span className="text-lg font-bold">{selectedPool.symbol}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4 w-full">
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary-focus"
                        onClick={handleMaxWithdraw}
                      >
                        MAX
                      </button>
                      <div className="flex-1 text-xs text-gray-500 text-right">
                        Available: {userStats.deposited} {selectedPool.symbol}
                      </div>
                    </div>
                    <button
                      className="bg-purple-200 btn btn-outline w-full"
                      onClick={handleWithdraw}
                      disabled={
                        isWithdrawing ||
                        !withdrawAmount ||
                        parseFloat(withdrawAmount) <= 0 ||
                        parseFloat(userStats.deposited) <= 0
                      }
                    >
                      {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 w-full flex flex-col items-center">
              <p className="text-xl mb-4">Connect your wallet to provide liquidity</p>
              <button className="btn btn-primary">Connect Wallet</button>
            </div>
          )}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-base-100 p-6 rounded-lg shadow-lg border border-base-300 mb-10">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-base-200 rounded p-4">
              <h3 className="text-lg font-semibold mb-1">Earn Passive Income</h3>
              <p className="text-gray-500 text-sm">
                Provide liquidity to the pool and earn interest from borrowers who take out uncollateralized loans.
              </p>
            </div>
            <div className="bg-base-200 rounded p-4">
              <h3 className="text-lg font-semibold mb-1">Risk Assessment</h3>
              <p className="text-gray-500 text-sm">
                Our reputation-based system evaluates borrowers to minimize default risk and protect your deposits.
              </p>
            </div>
            <div className="bg-base-200 rounded p-4">
              <h3 className="text-lg font-semibold mb-1">Dynamic Interest Rates</h3>
              <p className="text-gray-500 text-sm">
                APY varies based on pool utilization and borrower reputation scores.
              </p>
            </div>
          </div>
          <div className="space-y-4 flex flex-col h-full">
            <div className="bg-base-200 rounded p-4 flex-1">
              <h3 className="text-lg font-semibold mb-1">Withdraw Anytime</h3>
              <p className="text-gray-500 text-sm">
                Your funds are not locked. Withdraw your liquidity at any time (subject to available liquidity).
              </p>
            </div>
            <div className="bg-base-200 rounded p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Get Started</h3>
                <p className="text-gray-500 text-sm mb-2">
                  Join the community of lenders earning while supporting credit access for borrowers with good
                  reputation.
                </p>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex-1 bg-base-100 rounded p-3 text-center">
                  <div className="text-sm text-gray-400">Minimum Deposit</div>
                  <div className="font-bold text-primary text-lg">0.01 {selectedPool?.symbol || "ETH"}</div>
                </div>
                <div className="flex-1 bg-base-100 rounded p-3 text-center">
                  <div className="text-sm text-gray-400">Protocol Fee</div>
                  <div className="font-bold text-primary text-lg">0.5%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarnPage;
