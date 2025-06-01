import React from "react";
import { useTransactionPopup } from "@blockscout/app-sdk";
import { useAccount } from "wagmi";
import BorrowDashboard from "~~/components/custom/borrowDashboard";
import ReputationDashboard from "~~/components/custom/reputationDashboard";

export default function Body() {
  const { openPopup } = useTransactionPopup();
  const { address, isConnected } = useAccount();

  // Show transactions for the connected wallet address
  const showAddressTransactions = () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    openPopup({
      chainId: "747", // Ethereum mainnet
      address: address,
    });
  };

  // Show all transactions for a chain
  const showAllTransactions = () => {
    openPopup({
      chainId: "747", // Ethereum mainnet
    });
  };

  return (
    <div className="flex flex-col items-center grow w-full">
      <div className="flex flex-col md:flex-row justify-center items-start gap-6 w-full max-w-7xl">
        {/* Reputation dashboard card - wider */}
        <div className="w-full md:w-3/5 px-5 py-5.5 rounded-3xl shadow bg-secondary">
          <ReputationDashboard />
        </div>

        {/* Borrow dashboard card */}
        <div className="w-full md:w-2/5 px-5 py-5.5 rounded-3xl shadow bg-secondary">
          <BorrowDashboard />
        </div>
      </div>

      {/* Transaction buttons at the bottom */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={showAddressTransactions}
          disabled={!isConnected}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isConnected
              ? "bg-primary text-primary-content hover:bg-primary-focus"
              : "bg-gray-400 text-gray-600 cursor-not-allowed"
          }`}
        >
          View My Transactions {!isConnected && "(Connect Wallet)"}
        </button>
        <button
          onClick={showAllTransactions}
          className="px-4 py-2 bg-secondary text-secondary-content rounded-lg hover:bg-secondary-focus transition-colors"
        >
          View All Transactions
        </button>
      </div>
    </div>
  );
}
