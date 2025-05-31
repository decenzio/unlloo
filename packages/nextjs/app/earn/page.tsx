"use client";

import { useState } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Address } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const EarnPage = () => {
  const { address: connectedAddress } = useAccount();
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  // User's liquidity stats
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userStats, setUserStats] = useState({
    deposited: "0.0",
    earned: "0.0",
    apy: "5.2",
  });

  // Pool stats
  const [selectedPool, setSelectedPool] = useState<string>("ETH");
  const availablePools = [
    { id: "USDC", name: "USDC Pool" },
    { id: "WETH", name: "Wrapped Ethereum Pool" },
    { id: "WBTC", name: "Wrapped Btc Pool" },
  ];

  // Handle pool selection change
  const handlePoolChange = (poolId: string) => {
    setSelectedPool(poolId);
    // Here you would fetch pool-specific stats
    console.log("Switched to pool:", poolId);
    fetchPoolStats(poolId);
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [poolStats, setPoolStats] = useState({
    totalLiquidity: "125.75",
    activeLoans: "42",
    averageAPY: "5.2",
  });

  // Placeholder functions
  const handleDeposit = () => {
    console.log("Depositing amount:", depositAmount);
    notification.success("Deposit initiated!");
    // Reset input
    setDepositAmount("");
  };

  const handleWithdraw = () => {
    console.log("Withdrawing amount:", withdrawAmount);
    notification.success("Withdraw initiated!");
    // Reset input
    setWithdrawAmount("");
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchUserStats = () => {
    console.log("Fetching user stats for address:", connectedAddress);
    // This would be replaced with actual contract call
  };

  const fetchPoolStats = (poolId: string) => {
    console.log("Fetching pool stats for:", poolId);
    // This would be replaced with actual contract call
  };

  return (
    <div className="container mx-auto px-6 py-10 max-w-5xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Earn by Providing Liquidity</h1>
      <p className="text-xl mb-10 text-center text-gray-400">
        Provide liquidity to the uncollateralized lending pool and earn interest from reputation-based loans
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-base-200 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Liquidity</h2>
          <p className="text-4xl font-bold text-primary">{poolStats.totalLiquidity} ETH</p>
        </div>
        <div className="bg-base-200 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Active Loans</h2>
          <p className="text-4xl font-bold text-primary">{poolStats.activeLoans}</p>
        </div>
        <div className="bg-base-200 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Average APY</h2>
          <p className="text-4xl font-bold text-primary">{poolStats.averageAPY}%</p>
        </div>
      </div>
      {/* Pool Selection */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Select Liquidity Pool</h2>
        <div className="flex flex-wrap gap-3">
          {availablePools.map(pool => (
            <button
              key={pool.id}
              className={`btn btn-lg ${selectedPool === pool.id ? "btn-primary" : "btn-outline"}`}
              onClick={() => handlePoolChange(pool.id)}
            >
              {pool.name}
            </button>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-400">
          Selected pool: {availablePools.find(p => p.id === selectedPool)?.name}
        </div>
      </div>
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Provide Liquidity Section */}
        <div className="bg-base-100 p-8 rounded-lg shadow-lg border border-base-300">
          <h2 className="text-2xl font-bold mb-6">Provide Liquidity</h2>

          {connectedAddress ? (
            <>
              <div className="mb-8">
                <h3 className="text-xl mb-4">Your Stats</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Deposited</p>
                    <p className="text-xl font-bold">{userStats.deposited} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Earned</p>
                    <p className="text-xl font-bold text-green-500">+{userStats.earned} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Current APY</p>
                    <p className="text-xl font-bold">{userStats.apy}%</p>
                  </div>
                </div>
              </div>

              {/* Deposit Form */}
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Deposit</h3>
                <div className="flex items-center mb-4">
                  <input
                    type="text"
                    placeholder="0.0"
                    className="input input-bordered flex-1 mr-2"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                  />
                  <span className="text-lg font-bold">ETH</span>
                </div>
                <button
                  className="btn btn-primary w-full"
                  onClick={handleDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                >
                  Deposit to Earn
                </button>
              </div>

              {/* Withdraw Form */}
              <div>
                <h3 className="text-lg font-bold mb-2">Withdraw</h3>
                <div className="flex items-center mb-4">
                  <input
                    type="text"
                    placeholder="0.0"
                    className="input input-bordered flex-1 mr-2"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                  />
                  <span className="text-lg font-bold">ETH</span>
                </div>
                <button
                  className="btn btn-outline w-full"
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                >
                  Withdraw
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl mb-4">Connect your wallet to provide liquidity</p>
              <button className="btn btn-primary">Connect Wallet</button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-base-100 p-8 rounded-lg shadow-lg border border-base-300">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Earn Passive Income</h3>
              <p className="text-gray-400">
                By providing liquidity to the pool, you earn interest from borrowers who take out uncollateralized
                loans.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Risk Assessment</h3>
              <p className="text-gray-400">
                Our reputation-based system evaluates borrowers to minimize default risk and protect your deposits.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Dynamic Interest Rates</h3>
              <p className="text-gray-400">APY varies based on pool utilization and borrower reputation scores.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Withdraw Anytime</h3>
              <p className="text-gray-400">
                Your funds are not locked. You can withdraw your liquidity at any time (subject to available liquidity).
              </p>
            </div>

            <div className="pt-4">
              <h3 className="text-xl font-semibold mb-2">Get Started</h3>
              <p className="text-gray-400 mb-4">
                Join the community of lenders who are earning while supporting credit access for borrowers with good
                reputation.
              </p>

              <div className="stats bg-base-200 shadow w-full">
                <div className="stat">
                  <div className="stat-title">Minimum Deposit</div>
                  <div className="stat-value text-primary">0.01 ETH</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Protocol Fee</div>
                  <div className="stat-value text-primary">0.5%</div>
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
