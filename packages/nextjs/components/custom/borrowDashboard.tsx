import React, { useMemo, useState } from "react";
import { Address } from "viem";
import { ArrowTrendingUpIcon, ChevronDownIcon, CogIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { getTokenMetadata, useLoanMaster } from "~~/hooks/custom/useLoanMaster";

// Simple crypto icon component
const CryptoIcon = ({ symbol, color }: { symbol: string; color: string }) => (
  <div
    className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
    style={{ backgroundColor: color }}
  >
    {symbol.slice(0, 3)}
  </div>
);

export default function BorrowDashboard() {
  const {
    pools,
    userPositions,
    isLoading,
    error,
    borrow,
    repayBorrow,
    formatTokenAmount,
    TOKEN_ADDRESSES,
    getDisplayRepaymentAmount,
  } = useLoanMaster();

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<Address>(TOKEN_ADDRESSES.USDC);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [interestType, setInterestType] = useState<"stable" | "variable">("stable");
  const [isRepaying, setIsRepaying] = useState<Record<Address, boolean>>({});
  const [isBorrowing, setIsBorrowing] = useState(false);

  // Transform pools data for UI
  const borrowableAssets = useMemo(() => {
    return pools.map(pool => {
      const metadata = getTokenMetadata(pool.tokenAddress);
      return {
        tokenAddress: pool.tokenAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        iconColor: metadata.iconColor,
        decimals: metadata.decimals,
        available: parseFloat(formatTokenAmount(pool.liquidity, metadata.decimals)),
        borrowAPR: Number(pool.borrowAPR) / 100, // This now shows simulated APR
        depositAPR: Number(pool.depositAPR) / 100,
        liquidity: pool.liquidity,
      };
    });
  }, [pools, formatTokenAmount]);

  // Transform user borrows for UI with simulated interest
  const userBorrows = useMemo(() => {
    return userPositions.borrows.map(borrow => {
      const metadata = getTokenMetadata(borrow.tokenAddress);
      const displayRepayment = getDisplayRepaymentAmount(borrow.tokenAddress);

      return {
        tokenAddress: borrow.tokenAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        iconColor: metadata.iconColor,
        decimals: metadata.decimals,
        principalAmount: parseFloat(formatTokenAmount(borrow.amount, metadata.decimals)),
        simulatedInterest: borrow.simulatedInterest || 0,
        totalOwed: borrow.totalOwed || parseFloat(formatTokenAmount(borrow.amount, metadata.decimals)),
        borrowAPR: Number(borrow.pool.borrowAPR) / 100,
        rawAmount: borrow.amount,
        displayRepayment,
      };
    });
  }, [userPositions.borrows, formatTokenAmount, getDisplayRepaymentAmount]);

  const selectedAsset =
    borrowableAssets.find(asset => asset.tokenAddress === selectedTokenAddress) || borrowableAssets[0];

  // Calculate total borrowed value (with simulated interest for display)
  const totalBorrowedValue = userBorrows.reduce((total, borrow) => {
    // For demo purposes, assume 1:1 USD for USDC, you'd want real price feeds here
    if (borrow.symbol === "USDC") return total + borrow.totalOwed;
    // Add price conversion logic for other tokens
    return total + borrow.totalOwed;
  }, 0);

  const handleBorrow = async () => {
    if (!borrowAmount || !selectedAsset) return;

    setIsBorrowing(true);
    try {
      await borrow(selectedAsset.tokenAddress, borrowAmount, selectedAsset.decimals);
      setBorrowAmount("");
      console.log("Borrow successful!");
    } catch (error) {
      console.error("Borrow failed:", error);
      alert(`Borrow failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleRepay = async (tokenAddress: Address) => {
    setIsRepaying(prev => ({ ...prev, [tokenAddress]: true }));
    try {
      await repayBorrow(tokenAddress);
      console.log("Repayment successful!");
    } catch (error) {
      console.error("Repay failed:", error);
      alert(`Repay failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRepaying(prev => ({ ...prev, [tokenAddress]: false }));
    }
  };

  const handleRepayAll = async () => {
    for (const borrow of userBorrows) {
      try {
        await handleRepay(borrow.tokenAddress);
      } catch (error) {
        console.error(`Failed to repay ${borrow.symbol}:`, error);
      }
    }
  };

  const handleMaxAmount = () => {
    if (selectedAsset) {
      setBorrowAmount(selectedAsset.available.toString());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full bg-secondary">
      {/* Your Borrows Section */}
      <div className="w-full bg-base-100 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CogIcon className="h-5 w-5 text-indigo-600" />
            <span className="text-base font-medium">Your Borrows</span>
          </div>
        </div>

        <div className="p-4">
          {userBorrows.length > 0 ? (
            <div className="space-y-4">
              {userBorrows.map(borrow => (
                <div key={borrow.tokenAddress} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <CryptoIcon symbol={borrow.symbol} color={borrow.iconColor} />
                      <div>
                        <div className="font-medium">{borrow.symbol}</div>
                        <div className="text-xs text-gray-500">{borrow.name}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRepay(borrow.tokenAddress)}
                      disabled={isRepaying[borrow.tokenAddress]}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      {isRepaying[borrow.tokenAddress] ? "Repaying..." : "Repay"}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Principal Borrowed:</span>
                      <span className="font-medium">
                        {borrow.principalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{" "}
                        {borrow.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Accrued Interest:</span>
                      <span className="font-medium text-orange-600">
                        {borrow.simulatedInterest.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{" "}
                        {borrow.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600 font-medium">Total Owed:</span>
                      <span className="font-semibold text-lg">
                        {borrow.totalOwed.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{" "}
                        {borrow.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Borrow APR:</span>
                      <span className="font-medium text-indigo-600">{borrow.borrowAPR.toFixed(2)}%</span>
                    </div>
                  </div>

                  {/* Info about actual repayment */}
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    💡 <strong>Promotional Rate:</strong> You only need to repay the principal amount (
                    {borrow.principalAmount.toFixed(6)} {borrow.symbol}) - interest is waived!
                  </div>
                </div>
              ))}

              <div className="flex justify-between text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">
                <span>Total Owed (with interest):</span>
                <span className="font-semibold">${totalBorrowedValue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm text-green-600 mt-1">
                <span>Actual Repayment Required:</span>
                <span className="font-semibold">
                  $
                  {userBorrows
                    .reduce((total, borrow) => {
                      if (borrow.symbol === "USDC") return total + borrow.principalAmount;
                      return total + borrow.principalAmount;
                    }, 0)
                    .toFixed(2)}{" "}
                  (Principal Only!)
                </span>
              </div>

              <button
                onClick={handleRepayAll}
                disabled={Object.values(isRepaying).some(Boolean)}
                className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-indigo-600 border border-indigo-200 py-2 rounded-lg font-medium transition-colors mt-2"
              >
                {Object.values(isRepaying).some(Boolean) ? "Repaying..." : "Repay All Loans"}
              </button>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>You have not borrowed any assets yet</p>
              <p className="text-sm mt-1">Start borrowing from available liquidity pools</p>
            </div>
          )}
        </div>
      </div>

      {/* Borrow New Assets */}
      <div className="w-full bg-base-100 rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-indigo-600" />
            <span className="text-base font-medium">Borrow Assets</span>
          </div>
        </div>

        <div className="p-4">
          {borrowableAssets.length > 0 ? (
            <>
              {/* Promotional Banner */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                  🎉 <span>Limited Time Promotion!</span>
                </div>
                <p className="text-sm text-green-600">
                  Borrow with <strong>0% interest</strong> - you only repay the principal amount! Interest calculations
                  are shown for transparency but waived during our promotional period.
                </p>
              </div>

              {/* Asset Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
                <div className="relative">
                  <button
                    onClick={() => setShowAssetSelector(!showAssetSelector)}
                    className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CryptoIcon
                        symbol={selectedAsset?.symbol || "UNK"}
                        color={selectedAsset?.iconColor || "#6B7280"}
                      />
                      <div className="font-medium">{selectedAsset?.symbol || "Select Asset"}</div>
                    </div>
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  </button>

                  {showAssetSelector && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                      {borrowableAssets.map(asset => (
                        <button
                          key={asset.tokenAddress}
                          className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setSelectedTokenAddress(asset.tokenAddress);
                            setShowAssetSelector(false);
                            setBorrowAmount("");
                          }}
                        >
                          <CryptoIcon symbol={asset.symbol} color={asset.iconColor} />
                          <div>
                            <div className="font-medium text-left">{asset.symbol}</div>
                            <div className="text-xs text-gray-500 text-left">{asset.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Information */}
              {selectedAsset && (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Available in protocol</span>
                      <span className="font-medium">
                        {selectedAsset.available.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{" "}
                        {selectedAsset.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Standard Borrow APR</span>
                      <span className="font-medium text-indigo-600 line-through">
                        {selectedAsset.borrowAPR.toFixed(2)}%
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Promotional Rate</span>
                      <span className="font-bold text-green-600">0.00% 🎉</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Deposit APR</span>
                      <span className="font-medium text-green-600">{selectedAsset.depositAPR.toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={borrowAmount}
                          onChange={e => setBorrowAmount(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-3 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          {selectedAsset.symbol}
                        </div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          Token: {selectedAsset.tokenAddress.slice(0, 6)}...{selectedAsset.tokenAddress.slice(-4)}
                        </span>
                        <button
                          onClick={handleMaxAmount}
                          className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Interest Type Selection (for show) */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setInterestType("stable")}
                        className={`py-2 rounded-lg font-medium transition-colors ${
                          interestType === "stable"
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-indigo-200 text-indigo-600 hover:bg-gray-50"
                        }`}
                      >
                        Stable (0.00%)
                      </button>
                      <button
                        onClick={() => setInterestType("variable")}
                        className={`py-2 rounded-lg font-medium transition-colors ${
                          interestType === "variable"
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-indigo-200 text-indigo-600 hover:bg-gray-50"
                        }`}
                      >
                        Variable (0.00%)
                      </button>
                    </div>

                    <button
                      onClick={handleBorrow}
                      disabled={
                        isBorrowing ||
                        !borrowAmount ||
                        parseFloat(borrowAmount) <= 0 ||
                        parseFloat(borrowAmount) > selectedAsset.available
                      }
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      {isBorrowing
                        ? "Borrowing..."
                        : !borrowAmount || parseFloat(borrowAmount) <= 0
                          ? "Enter Amount"
                          : parseFloat(borrowAmount) > selectedAsset.available
                            ? "Insufficient Liquidity"
                            : `Borrow ${borrowAmount} ${selectedAsset.symbol}`}
                    </button>

                    {borrowAmount &&
                      parseFloat(borrowAmount) > 0 &&
                      parseFloat(borrowAmount) <= selectedAsset.available && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                          💰 <strong>You&#39;ll receive:</strong> {borrowAmount} {selectedAsset.symbol}
                          <br />
                          💳 <strong>You&#39;ll repay:</strong> {borrowAmount} {selectedAsset.symbol} (no interest!)
                        </div>
                      )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No liquidity pools available</p>
              <p className="text-sm mt-1">Please wait for pools to be created</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
