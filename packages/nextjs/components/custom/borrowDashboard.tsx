import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Address } from "viem";
import { ArrowTrendingUpIcon, ChevronDownIcon, CogIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useWbtcToUsd } from "~~/hooks/custom/useBtcPrice";
import { useEthToUsd } from "~~/hooks/custom/useEthPrice";
import { getTokenMetadata, useLoanMaster } from "~~/hooks/custom/useLoanMaster";
import { useUnlooToUsd } from "~~/hooks/custom/useUnlooPrice";

// Constants
const BORROWING_CAP_USD = 1.5;
const LOADING_TIMEOUT_MS = 10000;

// Types for better type safety
interface BorrowableAsset {
  tokenAddress: Address;
  symbol: string;
  name: string;
  iconColor: string;
  imageUrl?: string;
  decimals: number;
  available: number;
  borrowAPR: number;
  depositAPR: number;
  liquidity: bigint;
}

interface UserBorrow {
  tokenAddress: Address;
  symbol: string;
  name: string;
  iconColor: string;
  imageUrl?: string;
  decimals: number;
  principalAmount: number;
  simulatedInterest: number;
  totalOwed: number;
  borrowAPR: number;
  rawAmount: bigint;
  displayRepayment: string;
  usdValue: number;
}

// Logging utility
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[BorrowDashboard] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[BorrowDashboard] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[BorrowDashboard] ${message}`, data);
    }
  },
};

// Enhanced crypto icon component with better error handling
const CryptoIcon = React.memo(
  ({ symbol, color, imageUrl, size = 28 }: { symbol: string; color: string; imageUrl?: string; size?: number }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    const handleImageLoad = useCallback(() => {
      setImageError(false);
    }, []);

    if (imageUrl && !imageError) {
      return (
        <img
          src={imageUrl}
          alt={`${symbol} icon`}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      );
    }

    // Fallback to colored text icon
    return (
      <div
        className="rounded-full flex items-center justify-center text-white font-bold text-xs"
        style={{
          backgroundColor: color,
          width: size,
          height: size,
          fontSize: size * 0.35,
        }}
        aria-label={`${symbol} icon`}
      >
        {symbol.slice(0, 3)}
      </div>
    );
  },
);

CryptoIcon.displayName = "CryptoIcon";

// Custom hook for notifications
const useNotifications = () => {
  const showError = useCallback((message: string) => {
    logger.error("User notification", message);
    // TODO: Replace with proper toast notification system
    alert(message);
  }, []);

  const showSuccess = useCallback((message: string) => {
    logger.info("Success notification", message);
    // TODO: Replace with proper toast notification system
    alert(message);
  }, []);

  return { showError, showSuccess };
};

// Custom hook for loading timeout
const useLoadingTimeout = (isLoading: boolean, timeoutMs: number = LOADING_TIMEOUT_MS) => {
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (isLoading) {
        setIsTimedOut(true);
        logger.warn("Loading timeout reached");
      }
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return isTimedOut;
};

// Custom hook for managing borrow dashboard state
const useBorrowDashboardState = (TOKEN_ADDRESSES: any) => {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<Address>("");
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [isRepaying, setIsRepaying] = useState<Record<Address, boolean>>({});
  const [isBorrowing, setIsBorrowing] = useState(false);

  // Set default token address when available
  useEffect(() => {
    if (TOKEN_ADDRESSES.USDC && !selectedTokenAddress) {
      setSelectedTokenAddress(TOKEN_ADDRESSES.USDC);
    }
  }, [TOKEN_ADDRESSES.USDC, selectedTokenAddress]);

  // Set mounted flag after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return {
    isMounted,
    selectedTokenAddress,
    setSelectedTokenAddress,
    showAssetSelector,
    setShowAssetSelector,
    borrowAmount,
    setBorrowAmount,
    isRepaying,
    setIsRepaying,
    isBorrowing,
    setIsBorrowing,
  };
};

// Custom hook for calculating borrowed amounts
const useBorrowedAmounts = (userPositions: any, formatTokenAmount: any) => {
  return useMemo(() => {
    const amounts = { eth: 0, wbtc: 0, usdc: 0, unloo: 0 };

    userPositions.borrows.forEach((borrow: any) => {
      const metadata = getTokenMetadata(borrow.tokenAddress);
      const amount = parseFloat(formatTokenAmount(borrow.amount, metadata.decimals));

      switch (metadata.symbol) {
        case "WETH":
          amounts.eth += amount;
          break;
        case "WBTC":
          amounts.wbtc += amount;
          break;
        case "USDC":
          amounts.usdc += amount;
          break;
        case "UNLOO":
          amounts.unloo += amount;
          break;
      }
    });

    return amounts;
  }, [userPositions.borrows, formatTokenAmount]);
};

// Custom hook for USD calculations
const useUSDCalculations = (totalBorrowedAmounts: any, selectedAssetMetadata: any, borrowAmount: string) => {
  const { usdValue: ethBorrowedUsd, loading: ethLoading, error: ethError } = useEthToUsd(totalBorrowedAmounts.eth);
  const { usdValue: wbtcBorrowedUsd, loading: wbtcLoading, error: wbtcError } = useWbtcToUsd(totalBorrowedAmounts.wbtc);
  const {
    usdValue: unlooBorrowedUsd,
    loading: unlooLoading,
    error: unlooError,
  } = useUnlooToUsd(totalBorrowedAmounts.unloo);

  const currentBorrowAmountNumber = useMemo(() => {
    return parseFloat(borrowAmount) || 0;
  }, [borrowAmount]);

  // Get USD values for input amounts
  const ethInputAmount = selectedAssetMetadata?.symbol === "WETH" ? currentBorrowAmountNumber : 0;
  const wbtcInputAmount = selectedAssetMetadata?.symbol === "WBTC" ? currentBorrowAmountNumber : 0;
  const unlooInputAmount = selectedAssetMetadata?.symbol === "UNLOO" ? currentBorrowAmountNumber : 0;

  const { usdValue: ethInputUsd } = useEthToUsd(ethInputAmount);
  const { usdValue: wbtcInputUsd } = useWbtcToUsd(wbtcInputAmount);
  const { usdValue: unlooInputUsd } = useUnlooToUsd(unlooInputAmount);

  // Calculate total borrowed USD value
  const totalBorrowedUsd = useMemo(() => {
    let total = totalBorrowedAmounts.usdc; // USDC is 1:1 with USD

    if (ethBorrowedUsd !== null) total += ethBorrowedUsd;
    if (wbtcBorrowedUsd !== null) total += wbtcBorrowedUsd;
    if (unlooBorrowedUsd !== null) total += unlooBorrowedUsd;

    return total;
  }, [ethBorrowedUsd, wbtcBorrowedUsd, unlooBorrowedUsd, totalBorrowedAmounts.usdc]);

  // Calculate potential new total with current input
  const potentialNewTotal = useMemo(() => {
    if (!selectedAssetMetadata) return totalBorrowedUsd;

    let additionalAmount = 0;

    switch (selectedAssetMetadata.symbol) {
      case "WETH":
        additionalAmount = ethInputUsd || 0;
        break;
      case "WBTC":
        additionalAmount = wbtcInputUsd || 0;
        break;
      case "UNLOO":
        additionalAmount = unlooInputUsd || 0;
        break;
      case "USDC":
        additionalAmount = currentBorrowAmountNumber;
        break;
    }

    return totalBorrowedUsd + additionalAmount;
  }, [totalBorrowedUsd, selectedAssetMetadata, ethInputUsd, wbtcInputUsd, unlooInputUsd, currentBorrowAmountNumber]);

  return {
    ethBorrowedUsd,
    wbtcBorrowedUsd,
    unlooBorrowedUsd,
    ethLoading,
    wbtcLoading,
    unlooLoading,
    ethError,
    wbtcError,
    unlooError,
    ethInputUsd,
    wbtcInputUsd,
    unlooInputUsd,
    totalBorrowedUsd,
    potentialNewTotal,
    currentBorrowAmountNumber,
  };
};

export default function BorrowDashboard() {
  logger.info("Component render started");

  const {
    pools,
    userPositions,
    isLoading: loanMasterLoading,
    error: loanMasterError,
    borrow,
    repayBorrow,
    formatTokenAmount,
    TOKEN_ADDRESSES,
    getDisplayRepaymentAmount,
  } = useLoanMaster();

  const {
    isMounted,
    selectedTokenAddress,
    setSelectedTokenAddress,
    showAssetSelector,
    setShowAssetSelector,
    borrowAmount,
    setBorrowAmount,
    isRepaying,
    setIsRepaying,
    isBorrowing,
    setIsBorrowing,
  } = useBorrowDashboardState(TOKEN_ADDRESSES);

  const { showError, showSuccess } = useNotifications();

  // Calculate total borrowed amounts for each token
  const totalBorrowedAmounts = useBorrowedAmounts(userPositions, formatTokenAmount);

  // Calculate selected asset metadata
  const selectedAssetMetadata = useMemo(() => {
    return selectedTokenAddress ? getTokenMetadata(selectedTokenAddress) : null;
  }, [selectedTokenAddress]);

  // Get USD calculations
  const {
    ethBorrowedUsd,
    wbtcBorrowedUsd,
    unlooBorrowedUsd,
    ethLoading,
    wbtcLoading,
    unlooLoading,
    ethError,
    wbtcError,
    unlooError,
    ethInputUsd,
    wbtcInputUsd,
    unlooInputUsd,
    totalBorrowedUsd,
    potentialNewTotal,
    currentBorrowAmountNumber,
  } = useUSDCalculations(totalBorrowedAmounts, selectedAssetMetadata, borrowAmount);

  // Borrowing cap calculations
  const remainingBorrowCapacity = Math.max(0, BORROWING_CAP_USD - totalBorrowedUsd);
  const isOverCap = potentialNewTotal > BORROWING_CAP_USD;

  // Transform pools data for UI
  const borrowableAssets = useMemo((): BorrowableAsset[] => {
    return pools.map(pool => {
      const metadata = getTokenMetadata(pool.tokenAddress);
      const available = parseFloat(formatTokenAmount(pool.liquidity, metadata.decimals));

      return {
        tokenAddress: pool.tokenAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        iconColor: metadata.iconColor,
        imageUrl: metadata.imageUrl,
        decimals: metadata.decimals,
        available,
        borrowAPR: Number(pool.borrowAPR) / 100,
        depositAPR: Number(pool.depositAPR) / 100,
        liquidity: pool.liquidity,
      };
    });
  }, [pools, formatTokenAmount]);

  // Transform user borrows for UI with USD values
  const userBorrows = useMemo((): UserBorrow[] => {
    // @ts-ignore
    return userPositions.borrows.map((borrow: any) => {
      const metadata = getTokenMetadata(borrow.tokenAddress);
      const displayRepayment = getDisplayRepaymentAmount(borrow.tokenAddress);
      const principalAmount = parseFloat(formatTokenAmount(borrow.amount, metadata.decimals));

      // Calculate USD value for this borrow
      let usdValue = 0;
      if (metadata.symbol === "WETH" && ethBorrowedUsd !== null && totalBorrowedAmounts.eth > 0) {
        usdValue = (ethBorrowedUsd / totalBorrowedAmounts.eth) * principalAmount;
      } else if (metadata.symbol === "WBTC" && wbtcBorrowedUsd !== null && totalBorrowedAmounts.wbtc > 0) {
        usdValue = (wbtcBorrowedUsd / totalBorrowedAmounts.wbtc) * principalAmount;
      } else if (metadata.symbol === "UNLOO" && unlooBorrowedUsd !== null && totalBorrowedAmounts.unloo > 0) {
        usdValue = (unlooBorrowedUsd / totalBorrowedAmounts.unloo) * principalAmount;
      } else if (metadata.symbol === "USDC") {
        usdValue = principalAmount;
      }

      return {
        tokenAddress: borrow.tokenAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        iconColor: metadata.iconColor,
        imageUrl: metadata.imageUrl,
        decimals: metadata.decimals,
        principalAmount,
        simulatedInterest: borrow.simulatedInterest || 0,
        totalOwed: borrow.totalOwed || principalAmount,
        borrowAPR: Number(borrow.pool.borrowAPR) / 100,
        rawAmount: borrow.amount,
        displayRepayment,
        usdValue,
      };
    });
  }, [
    userPositions.borrows,
    formatTokenAmount,
    getDisplayRepaymentAmount,
    ethBorrowedUsd,
    wbtcBorrowedUsd,
    unlooBorrowedUsd,
    totalBorrowedAmounts,
  ]);

  const selectedAsset = useMemo(() => {
    return borrowableAssets.find(asset => asset.tokenAddress === selectedTokenAddress) || borrowableAssets[0];
  }, [borrowableAssets, selectedTokenAddress]);

  // Check for loading timeout
  const isLoadingTimedOut = useLoadingTimeout(loanMasterLoading || ethLoading || wbtcLoading || unlooLoading);

  // Event handlers
  const handleBorrow = useCallback(async () => {
    if (!borrowAmount || !selectedAsset || isOverCap) return;

    setIsBorrowing(true);
    try {
      await borrow(selectedAsset.tokenAddress, borrowAmount, selectedAsset.decimals);
      setBorrowAmount("");
      //showSuccess(`Successfully borrowed ${borrowAmount} ${selectedAsset.symbol}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showError(`Borrow failed: ${errorMessage}`);
    } finally {
      setIsBorrowing(false);
    }
  }, [borrowAmount, selectedAsset, isOverCap, borrow, showSuccess, showError]);

  const handleRepay = useCallback(
    async (tokenAddress: Address) => {
      setIsRepaying(prev => ({ ...prev, [tokenAddress]: true }));
      try {
        await repayBorrow(tokenAddress);
        //showSuccess("Repayment successful!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        showError(`Repay failed: ${errorMessage}`);
      } finally {
        setIsRepaying(prev => ({ ...prev, [tokenAddress]: false }));
      }
    },
    [repayBorrow, showSuccess, showError],
  );

  const handleRepayAll = useCallback(async () => {
    for (const borrow of userBorrows) {
      try {
        await handleRepay(borrow.tokenAddress);
      } catch (error) {
        logger.error(`Failed to repay ${borrow.symbol}`, error);
      }
    }
  }, [userBorrows, handleRepay]);

  const handleMaxAmount = useCallback(() => {
    if (!selectedAsset || !selectedAssetMetadata) return;

    const maxUsdAmount = remainingBorrowCapacity;
    let maxTokenAmount = selectedAsset.available;

    // Calculate max amount based on USD capacity and current prices
    if (selectedAssetMetadata.symbol === "WETH" && ethInputUsd !== null && currentBorrowAmountNumber > 0) {
      const ethPrice = ethInputUsd / currentBorrowAmountNumber;
      if (ethPrice > 0) {
        maxTokenAmount = Math.min(maxUsdAmount / ethPrice, selectedAsset.available);
      }
    } else if (selectedAssetMetadata.symbol === "WBTC" && wbtcInputUsd !== null && currentBorrowAmountNumber > 0) {
      const wbtcPrice = wbtcInputUsd / currentBorrowAmountNumber;
      if (wbtcPrice > 0) {
        maxTokenAmount = Math.min(maxUsdAmount / wbtcPrice, selectedAsset.available);
      }
    } else if (selectedAssetMetadata.symbol === "UNLOO" && unlooInputUsd !== null && currentBorrowAmountNumber > 0) {
      const unlooPrice = unlooInputUsd / currentBorrowAmountNumber;
      if (unlooPrice > 0) {
        maxTokenAmount = Math.min(maxUsdAmount / unlooPrice, selectedAsset.available);
      }
    } else if (selectedAssetMetadata.symbol === "USDC") {
      maxTokenAmount = Math.min(maxUsdAmount, selectedAsset.available);
    }

    const finalAmount = Math.max(0, maxTokenAmount).toFixed(6);
    setBorrowAmount(finalAmount);
  }, [
    selectedAsset,
    selectedAssetMetadata,
    remainingBorrowCapacity,
    ethInputUsd,
    wbtcInputUsd,
    unlooInputUsd,
    currentBorrowAmountNumber,
  ]);

  const handleAssetSelect = useCallback((tokenAddress: Address) => {
    setSelectedTokenAddress(tokenAddress);
    setShowAssetSelector(false);
    setBorrowAmount("");
  }, []);

  // Loading state
  if (loanMasterLoading || ethLoading || wbtcLoading || unlooLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <div className="text-sm text-gray-600 mt-4">Loading borrowing data...</div>
        <div className="text-xs text-gray-400 mt-2 max-w-md text-center">
          Mainnet operations may take longer due to network congestion.
          {isMounted && (
            <>
              <br />
              Current time: {new Date().toLocaleTimeString()}
            </>
          )}
        </div>

        {isLoadingTimedOut && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            ⚠️ Loading is taking longer than expected. Please check your connection.
          </div>
        )}

        {/* Debug info only in development */}
        {process.env.NODE_ENV === "development" && isMounted && (
          <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-2 rounded max-w-lg">
            <div>LoanMaster: {loanMasterLoading ? "Loading..." : "Ready"}</div>
            <div>ETH Price: {ethLoading ? "Loading..." : "Ready"}</div>
            <div>WBTC Price: {wbtcLoading ? "Loading..." : "Ready"}</div>
            <div>UNLOO Price: {unlooLoading ? "Loading..." : "Ready"}</div>
            <div>Pools: {pools.length}</div>
            <div>User Borrows: {userPositions.borrows.length}</div>
            {loanMasterError && <div className="text-red-600">Error: {loanMasterError}</div>}
            {(ethError || wbtcError || unlooError) && (
              <div className="text-red-600">Price Error: {ethError || wbtcError || unlooError}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (loanMasterError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <span>Error loading borrowing data: {loanMasterError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full bg-secondary">
      {/* Development Debug Panel - Only in development */}
      {process.env.NODE_ENV === "development" && isMounted && (
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs">
          <details>
            <summary className="font-medium cursor-pointer">🐛 Debug Info (Development Only)</summary>
            <div className="mt-2 space-y-1">
              <div>
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </div>
              <div>
                <strong>Total Borrowed USD:</strong> ${totalBorrowedUsd.toFixed(2)}
              </div>
              <div>
                <strong>Borrowable Assets:</strong> {borrowableAssets.length}
              </div>
              <div>
                <strong>Selected Asset:</strong> {selectedAsset?.symbol || "none"}
              </div>
              <div>
                <strong>User Borrows:</strong> {userBorrows.length}
              </div>
              <div>
                <strong>Price Values:</strong> ETH=${ethBorrowedUsd?.toFixed(2) || "null"}, WBTC=$
                {wbtcBorrowedUsd?.toFixed(2) || "null"}, UNLOO=${unlooBorrowedUsd?.toFixed(2) || "null"}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Borrowing Cap Display */}
      <div className="w-full bg-base-100 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-indigo-600" />
            <span className="text-base font-medium">Borrowing Capacity</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Total Borrowed (USD)</span>
            <span className="font-semibold text-lg">${totalBorrowedUsd.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Borrowing Limit</span>
            <span className="font-medium">${BORROWING_CAP_USD.toFixed(2)}</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                totalBorrowedUsd / BORROWING_CAP_USD > 0.8
                  ? "bg-red-500"
                  : totalBorrowedUsd / BORROWING_CAP_USD > 0.6
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min((totalBorrowedUsd / BORROWING_CAP_USD) * 100, 100)}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{((totalBorrowedUsd / BORROWING_CAP_USD) * 100).toFixed(1)}% used</span>
            <span className={`font-medium ${remainingBorrowCapacity > 0 ? "text-green-600" : "text-red-600"}`}>
              ${remainingBorrowCapacity.toFixed(2)} remaining
            </span>
          </div>

          {remainingBorrowCapacity <= 0 && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ⚠️ You have reached your borrowing limit. Please repay some loans to borrow more.
            </div>
          )}
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
                <div key={borrow.tokenAddress} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <CryptoIcon
                        symbol={borrow.symbol}
                        color={borrow.iconColor}
                        imageUrl={borrow.imageUrl}
                        size={32}
                      />
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
                      <span className="text-gray-600">USD Value:</span>
                      <span className="font-medium text-blue-600">${borrow.usdValue.toFixed(2)}</span>
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
                <span>Total Borrowed (USD):</span>
                <span className="font-semibold">${totalBorrowedUsd.toFixed(2)}</span>
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
                        imageUrl={selectedAsset?.imageUrl}
                        size={28}
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
                          onClick={() => handleAssetSelect(asset.tokenAddress)}
                        >
                          <CryptoIcon
                            symbol={asset.symbol}
                            color={asset.iconColor}
                            imageUrl={asset.imageUrl}
                            size={24}
                          />
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
                          className={`w-full border rounded-lg p-3 pr-20 focus:outline-none focus:ring-2 focus:border-transparent ${
                            isOverCap ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-indigo-500"
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-gray-400">
                          <CryptoIcon
                            symbol={selectedAsset.symbol}
                            color={selectedAsset.iconColor}
                            imageUrl={selectedAsset.imageUrl}
                            size={16}
                          />
                          <span className="text-sm">{selectedAsset.symbol}</span>
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

                      {/* USD Value Display */}
                      {borrowAmount && parseFloat(borrowAmount) > 0 && (
                        <div className="mt-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">USD Value:</span>
                            <span className="font-medium">
                              $
                              {selectedAssetMetadata?.symbol === "WETH" && ethInputUsd !== null
                                ? ethInputUsd.toFixed(2)
                                : selectedAssetMetadata?.symbol === "WBTC" && wbtcInputUsd !== null
                                  ? wbtcInputUsd.toFixed(2)
                                  : selectedAssetMetadata?.symbol === "UNLOO" && unlooInputUsd !== null
                                    ? unlooInputUsd.toFixed(2)
                                    : selectedAssetMetadata?.symbol === "USDC"
                                      ? currentBorrowAmountNumber.toFixed(2)
                                      : "0.00"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">New Total:</span>
                            <span className={`font-medium ${isOverCap ? "text-red-600" : "text-green-600"}`}>
                              ${potentialNewTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Over Cap Warning */}
                    {isOverCap && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        ⚠️ <strong>Borrowing Limit Exceeded:</strong> This amount would exceed your $1.50 borrowing
                        limit. Please reduce the amount or repay existing loans.
                      </div>
                    )}

                    <button
                      onClick={handleBorrow}
                      disabled={
                        isBorrowing ||
                        !borrowAmount ||
                        parseFloat(borrowAmount) <= 0 ||
                        parseFloat(borrowAmount) > selectedAsset.available ||
                        isOverCap ||
                        remainingBorrowCapacity <= 0
                      }
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      {isBorrowing
                        ? "Borrowing..."
                        : !borrowAmount || parseFloat(borrowAmount) <= 0
                          ? "Enter Amount"
                          : parseFloat(borrowAmount) > selectedAsset.available
                            ? "Insufficient Liquidity"
                            : isOverCap
                              ? "Exceeds Borrowing Limit"
                              : remainingBorrowCapacity <= 0
                                ? "Borrowing Limit Reached"
                                : `Borrow ${borrowAmount} ${selectedAsset.symbol}`}
                    </button>

                    {borrowAmount &&
                      parseFloat(borrowAmount) > 0 &&
                      parseFloat(borrowAmount) <= selectedAsset.available &&
                      !isOverCap && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                          💰 <strong>You&#39;ll receive:</strong> {borrowAmount} {selectedAsset.symbol}
                          <br />
                          💳 <strong>You&#39;ll repay:</strong> {borrowAmount} {selectedAsset.symbol} (no interest!)
                          <br />
                          💵 <strong>USD Value:</strong> $
                          {selectedAssetMetadata?.symbol === "WETH" && ethInputUsd !== null
                            ? ethInputUsd.toFixed(2)
                            : selectedAssetMetadata?.symbol === "WBTC" && wbtcInputUsd !== null
                              ? wbtcInputUsd.toFixed(2)
                              : selectedAssetMetadata?.symbol === "UNLOO" && unlooInputUsd !== null
                                ? unlooInputUsd.toFixed(2)
                                : selectedAssetMetadata?.symbol === "USDC"
                                  ? currentBorrowAmountNumber.toFixed(2)
                                  : "0.00"}
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
