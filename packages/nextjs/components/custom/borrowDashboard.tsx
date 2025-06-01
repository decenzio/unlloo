import React, { useEffect, useMemo, useState } from "react";
import { Address } from "viem";
import { ArrowTrendingUpIcon, ChevronDownIcon, CogIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useWbtcToUsd } from "~~/hooks/custom/useBtcPrice";
import { useEthToUsd } from "~~/hooks/custom/useEthPrice";
import { getTokenMetadata, useLoanMaster } from "~~/hooks/custom/useLoanMaster";
import { useUnlooToUsd } from "~~/hooks/custom/useUnlooPrice";

// Enhanced crypto icon component with image support
const CryptoIcon = ({
  symbol,
  color,
  imageUrl,
  size = 28,
}: {
  symbol: string;
  color: string;
  imageUrl?: string;
  size?: number;
}) => {
  const [imageError, setImageError] = useState(false);

  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={symbol}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
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
    >
      {symbol.slice(0, 3)}
    </div>
  );
};

export default function BorrowDashboard() {
  console.log(`[BorrowDashboard] Component render started at ${new Date().toISOString()}`);

  // Add state to track if component has mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);

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

  // Debug logging for LoanMaster contract
  useEffect(() => {
    console.log("[BorrowDashboard] LoanMaster contract check:", {
      isLoading: loanMasterLoading,
      error: loanMasterError,
      poolsLength: pools.length,
      timestamp: new Date().toISOString(),
    });
  }, [loanMasterLoading, loanMasterError, pools.length]);

  console.log(`[BorrowDashboard] useLoanMaster data:`, {
    poolsLength: pools.length,
    userPositionsLength: userPositions.borrows.length,
    isLoading: loanMasterLoading,
    error: loanMasterError,
    TOKEN_ADDRESSES,
    timestamp: new Date().toISOString(),
  });

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<Address>(TOKEN_ADDRESSES.USDC);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [isRepaying, setIsRepaying] = useState<Record<Address, boolean>>({});
  const [isBorrowing, setIsBorrowing] = useState(false);

  console.log(`[BorrowDashboard] Component state:`, {
    selectedTokenAddress,
    borrowAmount,
    isBorrowing,
    timestamp: new Date().toISOString(),
  });

  // Set mounted flag after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate total borrowed amounts for each token INCLUDING UNLOO
  const totalBorrowedAmounts = useMemo(() => {
    console.log(
      `[BorrowDashboard] Calculating totalBorrowedAmounts from userPositions.borrows:`,
      userPositions.borrows,
    );

    const amounts = {
      eth: 0,
      wbtc: 0,
      usdc: 0,
      unloo: 0, // Added UNLOO
    };

    userPositions.borrows.forEach((borrow, index) => {
      console.log(`[BorrowDashboard] Processing borrow ${index}:`, borrow);

      const metadata = getTokenMetadata(borrow.tokenAddress);
      console.log(`[BorrowDashboard] Token metadata for ${borrow.tokenAddress}:`, metadata);

      const amount = parseFloat(formatTokenAmount(borrow.amount, metadata.decimals));
      console.log(`[BorrowDashboard] Formatted amount:`, amount);

      if (metadata.symbol === "WETH") {
        amounts.eth += amount;
        console.log(`[BorrowDashboard] Added ${amount} to ETH, total now:`, amounts.eth);
      } else if (metadata.symbol === "WBTC") {
        amounts.wbtc += amount;
        console.log(`[BorrowDashboard] Added ${amount} to WBTC, total now:`, amounts.wbtc);
      } else if (metadata.symbol === "USDC") {
        amounts.usdc += amount;
        console.log(`[BorrowDashboard] Added ${amount} to USDC, total now:`, amounts.usdc);
      } else if (metadata.symbol === "UNLOO") {
        amounts.unloo += amount;
        console.log(`[BorrowDashboard] Added ${amount} to UNLOO, total now:`, amounts.unloo);
      }
    });

    console.log(`[BorrowDashboard] Final totalBorrowedAmounts:`, amounts);
    return amounts;
  }, [userPositions.borrows, formatTokenAmount]);

  // Get USD values for borrowed amounts INCLUDING UNLOO
  console.log(`[BorrowDashboard] About to call useEthToUsd with amount:`, totalBorrowedAmounts.eth);
  const { usdValue: ethBorrowedUsd, loading: ethLoading, error: ethError } = useEthToUsd(totalBorrowedAmounts.eth);
  console.log(`[BorrowDashboard] useEthToUsd result:`, {
    usdValue: ethBorrowedUsd,
    loading: ethLoading,
    error: ethError,
  });

  console.log(`[BorrowDashboard] About to call useWbtcToUsd with amount:`, totalBorrowedAmounts.wbtc);
  const { usdValue: wbtcBorrowedUsd, loading: wbtcLoading, error: wbtcError } = useWbtcToUsd(totalBorrowedAmounts.wbtc);
  console.log(`[BorrowDashboard] useWbtcToUsd result:`, {
    usdValue: wbtcBorrowedUsd,
    loading: wbtcLoading,
    error: wbtcError,
  });

  console.log(`[BorrowDashboard] About to call useUnlooToUsd with amount:`, totalBorrowedAmounts.unloo);
  const {
    usdValue: unlooBorrowedUsd,
    loading: unlooLoading,
    error: unlooError,
  } = useUnlooToUsd(totalBorrowedAmounts.unloo);
  console.log(`[BorrowDashboard] useUnlooToUsd result:`, {
    usdValue: unlooBorrowedUsd,
    loading: unlooLoading,
    error: unlooError,
  });

  // Calculate current USD value for the borrow amount input
  const selectedAssetMetadata = getTokenMetadata(selectedTokenAddress);
  console.log(`[BorrowDashboard] Selected asset metadata:`, selectedAssetMetadata);

  const currentBorrowAmountNumber = parseFloat(borrowAmount) || 0;
  console.log(`[BorrowDashboard] Current borrow amount number:`, currentBorrowAmountNumber);

  const ethInputAmount = selectedAssetMetadata.symbol === "WETH" ? currentBorrowAmountNumber : 0;
  const wbtcInputAmount = selectedAssetMetadata.symbol === "WBTC" ? currentBorrowAmountNumber : 0;
  const unlooInputAmount = selectedAssetMetadata.symbol === "UNLOO" ? currentBorrowAmountNumber : 0;

  console.log(
    `[BorrowDashboard] Input amounts - ETH: ${ethInputAmount}, WBTC: ${wbtcInputAmount}, UNLOO: ${unlooInputAmount}`,
  );

  const { usdValue: ethInputUsd, error: ethInputError } = useEthToUsd(ethInputAmount);
  const { usdValue: wbtcInputUsd, error: wbtcInputError } = useWbtcToUsd(wbtcInputAmount);
  const { usdValue: unlooInputUsd, error: unlooInputError } = useUnlooToUsd(unlooInputAmount);

  console.log(
    `[BorrowDashboard] Input USD values - ETH: ${ethInputUsd}, WBTC: ${wbtcInputUsd}, UNLOO: ${unlooInputUsd}`,
  );
  console.log(
    `[BorrowDashboard] Input errors - ETH: ${ethInputError}, WBTC: ${wbtcInputError}, UNLOO: ${unlooInputError}`,
  );

  // Calculate total borrowed USD value INCLUDING UNLOO
  const totalBorrowedUsd = useMemo(() => {
    console.log(`[BorrowDashboard] Calculating totalBorrowedUsd with:`, {
      ethBorrowedUsd,
      wbtcBorrowedUsd,
      unlooBorrowedUsd,
      usdcAmount: totalBorrowedAmounts.usdc,
    });

    let total = 0;

    if (ethBorrowedUsd !== null) {
      total += ethBorrowedUsd;
      console.log(`[BorrowDashboard] Added ETH USD value ${ethBorrowedUsd}, total now: ${total}`);
    }
    if (wbtcBorrowedUsd !== null) {
      total += wbtcBorrowedUsd;
      console.log(`[BorrowDashboard] Added WBTC USD value ${wbtcBorrowedUsd}, total now: ${total}`);
    }
    if (unlooBorrowedUsd !== null) {
      total += unlooBorrowedUsd;
      console.log(`[BorrowDashboard] Added UNLOO USD value ${unlooBorrowedUsd}, total now: ${total}`);
    }
    total += totalBorrowedAmounts.usdc; // USDC is 1:1 with USD
    console.log(`[BorrowDashboard] Added USDC ${totalBorrowedAmounts.usdc}, final total: ${total}`);

    return total;
  }, [ethBorrowedUsd, wbtcBorrowedUsd, unlooBorrowedUsd, totalBorrowedAmounts.usdc]);

  // Calculate potential new total with current input INCLUDING UNLOO
  const potentialNewTotal = useMemo(() => {
    console.log(`[BorrowDashboard] Calculating potentialNewTotal with:`, {
      totalBorrowedUsd,
      selectedAssetSymbol: selectedAssetMetadata.symbol,
      ethInputUsd,
      wbtcInputUsd,
      unlooInputUsd,
      currentBorrowAmountNumber,
    });

    let newTotal = totalBorrowedUsd;

    if (selectedAssetMetadata.symbol === "WETH" && ethInputUsd !== null) {
      newTotal += ethInputUsd;
      console.log(`[BorrowDashboard] Added WETH input ${ethInputUsd}, new total: ${newTotal}`);
    } else if (selectedAssetMetadata.symbol === "WBTC" && wbtcInputUsd !== null) {
      newTotal += wbtcInputUsd;
      console.log(`[BorrowDashboard] Added WBTC input ${wbtcInputUsd}, new total: ${newTotal}`);
    } else if (selectedAssetMetadata.symbol === "UNLOO" && unlooInputUsd !== null) {
      newTotal += unlooInputUsd;
      console.log(`[BorrowDashboard] Added UNLOO input ${unlooInputUsd}, new total: ${newTotal}`);
    } else if (selectedAssetMetadata.symbol === "USDC") {
      newTotal += currentBorrowAmountNumber;
      console.log(`[BorrowDashboard] Added USDC input ${currentBorrowAmountNumber}, new total: ${newTotal}`);
    }

    console.log(`[BorrowDashboard] Final potentialNewTotal: ${newTotal}`);
    return newTotal;
  }, [
    totalBorrowedUsd,
    selectedAssetMetadata.symbol,
    ethInputUsd,
    wbtcInputUsd,
    unlooInputUsd,
    currentBorrowAmountNumber,
  ]);

  // Borrowing cap constants
  const BORROWING_CAP_USD = 1.5;
  const remainingBorrowCapacity = Math.max(0, BORROWING_CAP_USD - totalBorrowedUsd);
  const isOverCap = potentialNewTotal > BORROWING_CAP_USD;

  console.log(`[BorrowDashboard] Borrowing calculations:`, {
    BORROWING_CAP_USD,
    totalBorrowedUsd,
    remainingBorrowCapacity,
    potentialNewTotal,
    isOverCap,
  });

  // Transform pools data for UI
  const borrowableAssets = useMemo(() => {
    console.log(`[BorrowDashboard] Transforming pools data, pools length: ${pools.length}`);

    const assets = pools.map((pool, index) => {
      console.log(`[BorrowDashboard] Processing pool ${index}:`, pool);

      const metadata = getTokenMetadata(pool.tokenAddress);
      console.log(`[BorrowDashboard] Pool metadata:`, metadata);

      const available = parseFloat(formatTokenAmount(pool.liquidity, metadata.decimals));
      console.log(`[BorrowDashboard] Pool available amount:`, available);

      const asset = {
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

      console.log(`[BorrowDashboard] Transformed asset:`, asset);
      return asset;
    });

    console.log(`[BorrowDashboard] Final borrowableAssets:`, assets);
    return assets;
  }, [pools, formatTokenAmount]);

  // Transform user borrows for UI with USD values INCLUDING UNLOO
  const userBorrows = useMemo(() => {
    console.log(`[BorrowDashboard] Transforming user borrows, length: ${userPositions.borrows.length}`);

    const borrows = userPositions.borrows.map((borrow, index) => {
      console.log(`[BorrowDashboard] Processing user borrow ${index}:`, borrow);

      const metadata = getTokenMetadata(borrow.tokenAddress);
      const displayRepayment = getDisplayRepaymentAmount(borrow.tokenAddress);
      const principalAmount = parseFloat(formatTokenAmount(borrow.amount, metadata.decimals));

      console.log(`[BorrowDashboard] Borrow calculations:`, {
        metadata,
        displayRepayment,
        principalAmount,
      });

      // Calculate USD value for this borrow INCLUDING UNLOO
      let usdValue = 0;
      if (metadata.symbol === "WETH" && ethBorrowedUsd !== null && totalBorrowedAmounts.eth > 0) {
        usdValue = (ethBorrowedUsd / totalBorrowedAmounts.eth) * principalAmount;
        console.log(
          `[BorrowDashboard] WETH USD value calculation: ${ethBorrowedUsd} / ${totalBorrowedAmounts.eth} * ${principalAmount} = ${usdValue}`,
        );
      } else if (metadata.symbol === "WBTC" && wbtcBorrowedUsd !== null && totalBorrowedAmounts.wbtc > 0) {
        usdValue = (wbtcBorrowedUsd / totalBorrowedAmounts.wbtc) * principalAmount;
        console.log(
          `[BorrowDashboard] WBTC USD value calculation: ${wbtcBorrowedUsd} / ${totalBorrowedAmounts.wbtc} * ${principalAmount} = ${usdValue}`,
        );
      } else if (metadata.symbol === "UNLOO" && unlooBorrowedUsd !== null && totalBorrowedAmounts.unloo > 0) {
        usdValue = (unlooBorrowedUsd / totalBorrowedAmounts.unloo) * principalAmount;
        console.log(
          `[BorrowDashboard] UNLOO USD value calculation: ${unlooBorrowedUsd} / ${totalBorrowedAmounts.unloo} * ${principalAmount} = ${usdValue}`,
        );
      } else if (metadata.symbol === "USDC") {
        usdValue = principalAmount;
        console.log(`[BorrowDashboard] USDC USD value: ${usdValue}`);
      }

      const transformedBorrow = {
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

      console.log(`[BorrowDashboard] Transformed borrow:`, transformedBorrow);
      return transformedBorrow;
    });

    console.log(`[BorrowDashboard] Final userBorrows:`, borrows);
    return borrows;
  }, [
    userPositions.borrows,
    formatTokenAmount,
    getDisplayRepaymentAmount,
    ethBorrowedUsd,
    wbtcBorrowedUsd,
    unlooBorrowedUsd,
    totalBorrowedAmounts,
  ]);

  const selectedAsset =
    borrowableAssets.find(asset => asset.tokenAddress === selectedTokenAddress) || borrowableAssets[0];

  console.log(`[BorrowDashboard] Selected asset:`, selectedAsset);

  // Add loading state tracking
  useEffect(() => {
    console.log(`[BorrowDashboard] Loading states changed:`, {
      loanMasterLoading,
      ethLoading,
      wbtcLoading,
      unlooLoading,
      timestamp: new Date().toISOString(),
    });
  }, [loanMasterLoading, ethLoading, wbtcLoading, unlooLoading]);

  // Add error tracking
  useEffect(() => {
    console.log(`[BorrowDashboard] Errors changed:`, {
      loanMasterError,
      ethError,
      wbtcError,
      unlooError,
      ethInputError,
      wbtcInputError,
      unlooInputError,
      timestamp: new Date().toISOString(),
    });
  }, [loanMasterError, ethError, wbtcError, unlooError, ethInputError, wbtcInputError, unlooInputError]);

  // Add effect to log when component is stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loanMasterLoading || ethLoading || wbtcLoading || unlooLoading) {
        console.warn(`[BorrowDashboard] Component has been loading for 10+ seconds:`, {
          loanMasterLoading,
          ethLoading,
          wbtcLoading,
          unlooLoading,
          poolsLength: pools.length,
          userPositionsLength: userPositions.borrows.length,
          timestamp: new Date().toISOString(),
        });
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [loanMasterLoading, ethLoading, wbtcLoading, unlooLoading, pools.length, userPositions.borrows.length]);

  const handleBorrow = async () => {
    console.log(`[BorrowDashboard] handleBorrow called with:`, {
      borrowAmount,
      selectedAsset,
      isOverCap,
      timestamp: new Date().toISOString(),
    });

    if (!borrowAmount || !selectedAsset || isOverCap) {
      console.log(`[BorrowDashboard] handleBorrow early return:`, {
        borrowAmountEmpty: !borrowAmount,
        noSelectedAsset: !selectedAsset,
        isOverCap,
      });
      return;
    }

    setIsBorrowing(true);
    try {
      console.log(`[BorrowDashboard] Starting borrow transaction...`);
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
    console.log(`[BorrowDashboard] handleRepay called for token:`, tokenAddress);

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
    console.log(`[BorrowDashboard] handleRepayAll called for ${userBorrows.length} borrows`);

    for (const borrow of userBorrows) {
      try {
        await handleRepay(borrow.tokenAddress);
      } catch (error) {
        console.error(`Failed to repay ${borrow.symbol}:`, error);
      }
    }
  };

  const handleMaxAmount = () => {
    console.log(`[BorrowDashboard] handleMaxAmount called`);

    if (selectedAsset) {
      // Calculate max amount based on remaining USD capacity
      const maxUsdAmount = remainingBorrowCapacity;
      let maxTokenAmount = selectedAsset.available;

      console.log(`[BorrowDashboard] Max amount calculation:`, {
        maxUsdAmount,
        maxTokenAmount,
        selectedAssetSymbol: selectedAssetMetadata.symbol,
      });

      if (selectedAssetMetadata.symbol === "WETH" && ethInputUsd !== null) {
        const ethPrice = currentBorrowAmountNumber > 0 ? (ethInputUsd || 0) / currentBorrowAmountNumber : 0;
        if (ethPrice > 0) {
          maxTokenAmount = Math.min(maxUsdAmount / ethPrice, selectedAsset.available);
        }
        console.log(`[BorrowDashboard] WETH max calculation: price=${ethPrice}, maxTokenAmount=${maxTokenAmount}`);
      } else if (selectedAssetMetadata.symbol === "WBTC" && wbtcInputUsd !== null) {
        const wbtcPrice = currentBorrowAmountNumber > 0 ? (wbtcInputUsd || 0) / currentBorrowAmountNumber : 0;
        if (wbtcPrice > 0) {
          maxTokenAmount = Math.min(maxUsdAmount / wbtcPrice, selectedAsset.available);
        }
        console.log(`[BorrowDashboard] WBTC max calculation: price=${wbtcPrice}, maxTokenAmount=${maxTokenAmount}`);
      } else if (selectedAssetMetadata.symbol === "UNLOO" && unlooInputUsd !== null) {
        const unlooPrice = currentBorrowAmountNumber > 0 ? (unlooInputUsd || 0) / currentBorrowAmountNumber : 0;
        if (unlooPrice > 0) {
          maxTokenAmount = Math.min(maxUsdAmount / unlooPrice, selectedAsset.available);
        }
        console.log(`[BorrowDashboard] UNLOO max calculation: price=${unlooPrice}, maxTokenAmount=${maxTokenAmount}`);
      } else if (selectedAssetMetadata.symbol === "USDC") {
        maxTokenAmount = Math.min(maxUsdAmount, selectedAsset.available);
        console.log(`[BorrowDashboard] USDC max calculation: maxTokenAmount=${maxTokenAmount}`);
      }

      const finalAmount = Math.max(0, maxTokenAmount).toFixed(6);
      console.log(`[BorrowDashboard] Setting max amount to: ${finalAmount}`);
      setBorrowAmount(finalAmount);
    }
  };

  console.log(`[BorrowDashboard] About to check loading condition:`, {
    loanMasterLoading,
    ethLoading,
    wbtcLoading,
    unlooLoading,
    shouldShowLoading: loanMasterLoading || ethLoading || wbtcLoading || unlooLoading,
  });

  if (loanMasterLoading || ethLoading || wbtcLoading || unlooLoading) {
    console.log(`[BorrowDashboard] Rendering loading state`);
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <div className="text-sm text-gray-600 mt-4">
          Loading...
          {loanMasterLoading && " (Contract data)"}
          {ethLoading && " (ETH prices)"}
          {wbtcLoading && " (WBTC prices)"}
          {unlooLoading && " (UNLOO prices)"}
        </div>
        <div className="text-xs text-gray-400 mt-2 max-w-md text-center">
          Mainnet operations may take longer due to network congestion.
          {isMounted && (
            <>
              <br />
              Current time: {new Date().toLocaleTimeString()}
            </>
          )}
        </div>
        {/* Debug info in loading state */}
        {isMounted && (
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

  console.log(`[BorrowDashboard] Checking for errors:`, {
    loanMasterError,
    hasError: !!loanMasterError,
  });

  if (loanMasterError) {
    console.log(`[BorrowDashboard] Rendering error state`);
    return (
      <div className="flex items-center justify-center p-8">
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <span>Error: {loanMasterError}</span>
        </div>
      </div>
    );
  }

  console.log(`[BorrowDashboard] Rendering main component`);

  return (
    <div className="flex flex-col items-center w-full bg-secondary">
      {/* Development Debug Panel */}
      {process.env.NODE_ENV === "development" && isMounted && (
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs">
          <details>
            <summary className="font-medium cursor-pointer">🐛 Debug Info (Development Only)</summary>
            <div className="mt-2 space-y-1">
              <div>
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </div>
              <div>
                <strong>Loading States:</strong> LoanMaster={loanMasterLoading.toString()}, ETH={ethLoading.toString()},
                WBTC={wbtcLoading.toString()}, UNLOO={unlooLoading.toString()}
              </div>
              <div>
                <strong>Data Counts:</strong> Pools={pools.length}, Borrows={userPositions.borrows.length}
              </div>
              <div>
                <strong>Price Values:</strong> ETH=${ethBorrowedUsd?.toFixed(2) || "null"}, WBTC=$
                {wbtcBorrowedUsd?.toFixed(2) || "null"}, UNLOO=${unlooBorrowedUsd?.toFixed(2) || "null"}
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
                <strong>Errors:</strong> LoanMaster={loanMasterError || "none"}, ETH={ethError || "none"}, WBTC=
                {wbtcError || "none"}, UNLOO={unlooError || "none"}
              </div>
              <div>
                <strong>Token Addresses:</strong>
              </div>
              <div className="ml-4">USDC: {TOKEN_ADDRESSES.USDC}</div>
              <div className="ml-4">WETH: {TOKEN_ADDRESSES.WETH}</div>
              <div className="ml-4">WBTC: {TOKEN_ADDRESSES.WBTC}</div>
              <div className="ml-4">UNLOO: {TOKEN_ADDRESSES.UNLOO}</div>
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
                          onClick={() => {
                            setSelectedTokenAddress(asset.tokenAddress);
                            setShowAssetSelector(false);
                            setBorrowAmount("");
                          }}
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
                              {selectedAssetMetadata.symbol === "WETH" && ethInputUsd !== null
                                ? ethInputUsd.toFixed(2)
                                : selectedAssetMetadata.symbol === "WBTC" && wbtcInputUsd !== null
                                  ? wbtcInputUsd.toFixed(2)
                                  : selectedAssetMetadata.symbol === "UNLOO" && unlooInputUsd !== null
                                    ? unlooInputUsd.toFixed(2)
                                    : selectedAssetMetadata.symbol === "USDC"
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
                          {selectedAssetMetadata.symbol === "WETH" && ethInputUsd !== null
                            ? ethInputUsd.toFixed(2)
                            : selectedAssetMetadata.symbol === "WBTC" && wbtcInputUsd !== null
                              ? wbtcInputUsd.toFixed(2)
                              : selectedAssetMetadata.symbol === "UNLOO" && unlooInputUsd !== null
                                ? unlooInputUsd.toFixed(2)
                                : selectedAssetMetadata.symbol === "USDC"
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
