import { useCallback, useMemo, useState } from "react";
import { useWbtcToUsd } from "./useBtcPrice";
import { useEthToUsd } from "./useEthPrice";
import { getTokenMetadata, useLoanMaster } from "./useLoanMaster";
import { useUnlooToUsd } from "./useUnlooPrice";
import { Address } from "viem";

export const useBorrowDashboard = () => {
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<Address>("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [isRepaying, setIsRepaying] = useState<Record<Address, boolean>>({});
  const [isBorrowing, setIsBorrowing] = useState(false);

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

  // Calculate total borrowed amounts
  const totalBorrowedAmounts = useMemo(() => {
    const amounts = { eth: 0, wbtc: 0, usdc: 0, unloo: 0 };

    userPositions.borrows.forEach(borrow => {
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

  // Get USD values
  const { usdValue: ethBorrowedUsd, loading: ethLoading } = useEthToUsd(totalBorrowedAmounts.eth);
  const { usdValue: wbtcBorrowedUsd, loading: wbtcLoading } = useWbtcToUsd(totalBorrowedAmounts.wbtc);
  const { usdValue: unlooBorrowedUsd, loading: unlooLoading } = useUnlooToUsd(totalBorrowedAmounts.unloo);

  const totalBorrowedUsd = useMemo(() => {
    let total = totalBorrowedAmounts.usdc;
    if (ethBorrowedUsd !== null) total += ethBorrowedUsd;
    if (wbtcBorrowedUsd !== null) total += wbtcBorrowedUsd;
    if (unlooBorrowedUsd !== null) total += unlooBorrowedUsd;
    return total;
  }, [ethBorrowedUsd, wbtcBorrowedUsd, unlooBorrowedUsd, totalBorrowedAmounts.usdc]);

  const handleBorrow = useCallback(
    async (asset: any) => {
      if (!borrowAmount || !asset) return;

      setIsBorrowing(true);
      try {
        await borrow(asset.tokenAddress, borrowAmount, asset.decimals);
        setBorrowAmount("");
        return { success: true };
      } catch (error) {
        return { success: false, error };
      } finally {
        setIsBorrowing(false);
      }
    },
    [borrowAmount, borrow],
  );

  const handleRepay = useCallback(
    async (tokenAddress: Address) => {
      setIsRepaying(prev => ({ ...prev, [tokenAddress]: true }));
      try {
        await repayBorrow(tokenAddress);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      } finally {
        setIsRepaying(prev => ({ ...prev, [tokenAddress]: false }));
      }
    },
    [repayBorrow],
  );

  return {
    // State
    selectedTokenAddress,
    setSelectedTokenAddress,
    borrowAmount,
    setBorrowAmount,
    isRepaying,
    isBorrowing,

    // Data
    pools,
    userPositions,
    totalBorrowedAmounts,
    totalBorrowedUsd,
    TOKEN_ADDRESSES,

    // Loading states
    isLoading: loanMasterLoading || ethLoading || wbtcLoading || unlooLoading,
    loanMasterError,

    // Actions
    handleBorrow,
    handleRepay,
    formatTokenAmount,
    getDisplayRepaymentAmount,
  };
};
