import React, { useState } from "react";
import { ArrowTrendingUpIcon, ChevronDownIcon, CogIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

// Mock data for assets with inline SVG icons instead of URLs
const borrowableAssets = [
  {
    symbol: "ETH",
    name: "Ethereum",
    iconColor: "#627EEA",
    available: 12.5,
    apy: 3.2,
    variableApy: 3.5,
    userLimit: 1.25,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    iconColor: "#2775CA",
    available: 25000,
    apy: 2.8,
    variableApy: 3.1,
    userLimit: 2250,
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    iconColor: "#F7931A",
    available: 0.75,
    apy: 2.1,
    variableApy: 2.4,
    userLimit: 0.085,
  },
];

// Mock user data
const userBorrows = [
  {
    symbol: "USDC",
    name: "USD Coin",
    iconColor: "#2775CA",
    amount: 450,
    apy: 2.8,
    healthFactor: 1.85,
  },
];

// Simple crypto icon component
const CryptoIcon = ({ symbol, color }: { symbol: string; color: string }) => (
  <div
    className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
    style={{ backgroundColor: color }}
  >
    {symbol}
  </div>
);

export default function BorrowDashboard() {
  const [selectedAsset, setSelectedAsset] = useState(borrowableAssets[0]);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const currentDatetime = "2025-05-31 01:17:14";

  return (
    <div className="flex flex-col items-center w-full">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Credit Market</h2>
        <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          Health Factor: {userBorrows.length > 0 ? "1.85" : "∞"}
        </div>
      </div>

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
                <div key={borrow.symbol} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol={borrow.symbol} color={borrow.iconColor} />
                    <div>
                      <div className="font-medium">{borrow.symbol}</div>
                      <div className="text-xs text-gray-500">{borrow.name}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold">
                      {borrow.amount.toLocaleString()} {borrow.symbol}
                    </div>
                    <div className="text-xs text-gray-500">APY: {borrow.apy}%</div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">
                <span>Total Borrowed</span>
                <span>$450.00</span>
              </div>

              <button className="w-full bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200 py-2 rounded-lg font-medium transition-colors mt-2">
                Repay Loans
              </button>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>You have not borrowed any assets yet</p>
              <p className="text-sm mt-1">Your reputation score enables you to borrow without collateral</p>
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
          {/* Asset Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
            <div className="relative">
              <button
                onClick={() => setShowAssetSelector(!showAssetSelector)}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CryptoIcon symbol={selectedAsset.symbol} color={selectedAsset.iconColor} />
                  <div className="font-medium">{selectedAsset.symbol}</div>
                </div>
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              </button>

              {showAssetSelector && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                  {borrowableAssets.map(asset => (
                    <button
                      key={asset.symbol}
                      className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setShowAssetSelector(false);
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
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Available in protocol</span>
              <span className="font-medium">
                {selectedAsset.available.toLocaleString()} {selectedAsset.symbol}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Your borrowing limit</span>
              <span className="font-medium">
                {selectedAsset.userLimit.toLocaleString()} {selectedAsset.symbol}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Stable APY</span>
              <span className="font-medium text-indigo-600">{selectedAsset.apy}%</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Variable APY</span>
              <span className="font-medium text-indigo-600">{selectedAsset.variableApy}%</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg p-3 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {selectedAsset.symbol}
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">≈ $0.00</span>
                <button className="text-xs text-indigo-600 font-medium">MAX</button>
              </div>
            </div>

            {/* Interest Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-indigo-600 text-white py-2 rounded-lg font-medium transition-colors">Stable</button>
              <button className="bg-white border border-indigo-200 text-indigo-600 py-2 rounded-lg font-medium transition-colors hover:bg-gray-50">
                Variable
              </button>
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition-colors">
              Borrow {selectedAsset.symbol}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Last updated: <time dateTime={currentDatetime}>{currentDatetime}</time>
        </p>
      </div>
    </div>
  );
}
