import React, { useMemo } from "react";
import BorrowDashboard from "~~/components/custom/borrowDashboard";
import ReputationDashboard from "~~/components/custom/reputationDashboard";
import { useTransactionActions } from "~~/hooks/custom/useTransactionAction";

// Consider moving to a toast library like react-hot-toast
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const showNotification = (message: string, type: "error" | "success" = "error") => {
  // Temporary fallback - replace with proper toast notification
  alert(message);
};

export default function Body() {
  const { showAddressTransactions, showAllTransactions, isWalletConnected } = useTransactionActions();

  const handleAddressTransactions = async () => {
    try {
      await showAddressTransactions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";

      if (message === "Wallet not connected") {
        showNotification("Please connect your wallet first");
      } else {
        console.error("Transaction popup error:", error);
        showNotification("Failed to load transactions. Please try again.");
      }
    }
  };

  const handleAllTransactions = async () => {
    try {
      await showAllTransactions();
    } catch (error) {
      console.error("All transactions popup error:", error);
      showNotification("Failed to load transactions. Please try again.");
    }
  };

  const walletButtonText = useMemo(() => {
    return `View My Transactions${!isWalletConnected ? " (Connect Wallet)" : ""}`;
  }, [isWalletConnected]);

  return (
    <div className="flex flex-col items-center grow w-full">
      <main className="flex flex-col md:flex-row justify-center items-start gap-6 w-full max-w-7xl">
        <section
          className="w-full md:w-3/5 px-5 py-5.5 rounded-3xl shadow bg-secondary"
          aria-label="Reputation Dashboard"
        >
          <ReputationDashboard />
        </section>

        <section className="w-full md:w-2/5 px-5 py-5.5 rounded-3xl shadow bg-secondary" aria-label="Borrow Dashboard">
          <BorrowDashboard />
        </section>
      </main>

      <footer className="flex gap-4 mt-6" role="group" aria-label="Transaction actions">
        <button
          onClick={handleAddressTransactions}
          disabled={!isWalletConnected}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isWalletConnected
              ? "bg-primary text-primary-content hover:bg-primary-focus focus:ring-2 focus:ring-primary"
              : "bg-gray-400 text-gray-600 cursor-not-allowed"
          }`}
          aria-label={isWalletConnected ? "View your transactions" : "Connect wallet to view transactions"}
        >
          {walletButtonText}
        </button>

        <button
          onClick={handleAllTransactions}
          className="px-4 py-2 bg-secondary text-secondary-content rounded-lg hover:bg-secondary-focus focus:ring-2 focus:ring-secondary transition-colors"
          aria-label="View all transactions on the network"
        >
          View All Transactions
        </button>
      </footer>
    </div>
  );
}
