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
        <div className="bg-purple-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-purple-700">Total Liquidity</h2>
          <p className="text-4xl font-bold text-purple-700">{poolStats.totalLiquidity} ETH</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-green-700">Active Loans</h2>
          <p className="text-4xl font-bold text-green-700">{poolStats.activeLoans}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-yellow-700">Average APY</h2>
          <p className="text-4xl font-bold text-yellow-700">{poolStats.averageAPY}%</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-12">
        {/* Provide Liquidity Section - now full width and centered */}
        <div className="bg-base-100 p-8 rounded-lg shadow-lg border border-base-300 w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-6 text-center">Provide Liquidity</h2>

          {connectedAddress ? (
            <>
              {/* Stats */}
              <div className="mb-8 w-full flex flex-col items-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                  {/* Deposited */}
                  <div className="bg-base-200 rounded-lg shadow flex flex-col items-center py-2 px-1">
                    <p className="text-sm text-gray-400 mb-0">Deposited</p>
                    <p className="text-xl font-bold mt-0">{userStats.deposited} ETH</p>
                  </div>
                  {/* Earned */}
                  <div className="bg-base-200 rounded-lg shadow flex flex-col items-center py-2 px-1">
                    <p className="text-sm text-gray-400 mb-0">Earned</p>
                    <p className="text-xl font-bold text-green-500 mt-0">+{userStats.earned} ETH</p>
                  </div>
                  {/* APY */}
                  <div className="bg-base-200 rounded-lg shadow flex flex-col items-center py-2 px-1">
                    <p className="text-sm text-gray-400 mb-0">Current APY</p>
                    <p className="text-xl font-bold mt-0">{userStats.apy}%</p>
                  </div>
                </div>
              </div>

              {/* Pool Selection BELOW the stats */}
              <div className="mb-8 w-full flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 text-center">Select Liquidity Pool</h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {availablePools.map(pool => (
                    <button
                      key={pool.id}
                      className={`btn btn-sm ${selectedPool === pool.id ? "btn-primary" : "btn-outline"}`}
                      onClick={() => handlePoolChange(pool.id)}
                    >
                      {pool.name}
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-400 text-center">
                  Selected pool: {availablePools.find(p => p.id === selectedPool)?.name}
                </div>
              </div>

              {/* Deposit and Withdraw side by side, centered */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
                {/* Deposit Form */}
                <div className="bg-base-300 p-6 rounded-lg shadow-lg flex flex-col items-center">
                  <h3 className="text-xl font-bold mb-2 text-center">Deposit</h3>
                  <div className="flex items-center mb-4 w-full">
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
                    className="bg-purple-200 btn btn-primary w-full"
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                  >
                    Deposit to Earn
                  </button>
                </div>

                {/* Withdraw Form */}
                <div className="bg-base-300 p-6 rounded-lg shadow-lg flex flex-col items-center">
                  <h3 className="text-xl font-bold mb-2 text-center">Withdraw</h3>
                  <div className="flex items-center mb-4 w-full">
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
                    className="bg-purple-200 btn btn-outline w-full"
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 w-full flex flex-col items-center">
              <p className="text-xl mb-4">Connect your wallet to provide liquidity</p>
              <button className="btn btn-primary">Connect Wallet</button>
            </div>
          )}
        </div>
      </div>
      {/* How It Works Section - now full width below */}
      <div className="bg-base-100 p-6 rounded-lg shadow-lg border border-base-300 mb-10">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column */}
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
          {/* Right column */}
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
                  <div className="font-bold text-primary text-lg">0.01 ETH</div>
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
