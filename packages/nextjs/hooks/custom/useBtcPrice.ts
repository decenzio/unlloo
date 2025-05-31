import { useEffect, useState } from "react";

export const useWbtcToUsd = (wbtcAmount: number) => {
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/price/wbtc");

      if (!response.ok) {
        throw new Error("Failed to fetch WBTC exchange rate");
      }

      const data = await response.json();
      const rate = parseFloat(data.exchange_rate);

      if (isNaN(rate)) {
        throw new Error("Invalid exchange rate data");
      }

      setUsdValue(rate * wbtcAmount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setUsdValue(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wbtcAmount > 0) {
      fetchRate();
    }
  }, [wbtcAmount]);

  return { usdValue, loading, error, refetch: fetchRate };
};
