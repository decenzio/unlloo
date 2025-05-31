import { useEffect, useState } from "react";

export const useEthToUsd = (ethAmount: number) => {
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false); // Changed from true to false
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching ETH price for amount:", ethAmount);

      const response = await fetch("/api/v1/price/eth");

      if (!response.ok) {
        throw new Error(`Failed to fetch ETH price: ${response.status}`);
      }

      const data = await response.json();
      console.log("ETH price response:", data);

      const price = parseFloat(data.coin_price);

      if (isNaN(price)) {
        throw new Error("Invalid price data received");
      }

      const calculatedUsdValue = price * ethAmount;
      console.log("Calculated USD value:", calculatedUsdValue);

      setUsdValue(calculatedUsdValue);
      setError(null);
    } catch (err) {
      console.error("Error in useEthToUsd:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setUsdValue(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ethAmount >= 0) {
      // Changed from > 0 to >= 0 to handle 0 amounts
      fetchPrice();
    } else {
      setUsdValue(null);
      setLoading(false);
      setError(null);
    }
  }, [ethAmount]);

  return { usdValue, loading, error, refetch: fetchPrice };
};
