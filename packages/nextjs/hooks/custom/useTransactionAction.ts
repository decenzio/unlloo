import { useCallback } from "react";
import { useTransactionPopup } from "@blockscout/app-sdk";
import { useAccount } from "wagmi";

const CHAIN_ID = "747";

export const useTransactionActions = () => {
  const { openPopup } = useTransactionPopup();
  const { address, isConnected } = useAccount();

  const showAddressTransactions = useCallback(() => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    return openPopup({
      chainId: CHAIN_ID,
      address: address,
    });
  }, [isConnected, address, openPopup]);

  const showAllTransactions = useCallback(() => {
    return openPopup({
      chainId: CHAIN_ID,
    });
  }, [openPopup]);

  return {
    showAddressTransactions,
    showAllTransactions,
    isWalletConnected: isConnected,
    walletAddress: address,
  };
};
