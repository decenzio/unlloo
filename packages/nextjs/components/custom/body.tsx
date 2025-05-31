import React from "react";
import BorrowDashboard from "~~/components/custom/borrowDashboard";
import ReputationDashboard from "~~/components/custom/reputationDashboard";

export default function Body() {
  return (
    <div className="flex flex-col items-center grow w-full">
      <div className="flex flex-col md:flex-row justify-center items-start gap-6 w-full max-w-7xl">
        {/* Reputation dashboard card - wider */}
        <div className="w-full md:w-3/5 px-5 py-8 rounded-3xl shadow bg-secondary">
          <ReputationDashboard />
        </div>

        {/* Borrow dashboard card */}
        <div className="w-full md:w-2/5 px-5 py-8 rounded-3xl shadow bg-secondary">
          <BorrowDashboard />
        </div>
      </div>
    </div>
  );
}
