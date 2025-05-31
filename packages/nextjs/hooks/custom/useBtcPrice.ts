import { useEffect, useState } from "react";

export const useWbtcToUsd = (wbtcAmount: number) => {
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false); // Changed from true to false
  const [error, setError] = useState<string | null>(null);

  const fetchRate = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching WBTC rate for amount:", wbtcAmount);

      const response = await fetch("/api/v1/price/wbtc");

      if (!response.ok) {
        throw new Error(`Failed to fetch WBTC exchange rate: ${response.status}`);
      }

      const data = await response.json();
      console.log("WBTC rate response:", data);

      const rate = parseFloat(data.exchange_rate);

      if (isNaN(rate)) {
        throw new Error("Invalid exchange rate data received");
      }

      const calculatedUsdValue = rate * wbtcAmount;
      console.log("Calculated USD value:", calculatedUsdValue);

      setUsdValue(calculatedUsdValue);
      setError(null);
    } catch (err) {
      console.error("Error in useWbtcToUsd:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setUsdValue(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wbtcAmount >= 0) {
      // Changed from > 0 to >= 0 to handle 0 amounts
      fetchRate();
    } else {
      setUsdValue(null);
      setLoading(false);
      setError(null);
    }
  }, [wbtcAmount]);

  return { usdValue, loading, error, refetch: fetchRate };
};
