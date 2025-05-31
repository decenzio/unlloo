import { useEffect, useState } from "react";

export const useEthToUsd = (ethAmount: number) => {
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/price/eth");

      if (!response.ok) {
        throw new Error("Failed to fetch ETH price");
      }

      const data = await response.json();
      const price = parseFloat(data.coin_price);

      if (isNaN(price)) {
        throw new Error("Invalid price data");
      }

      setUsdValue(price * ethAmount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setUsdValue(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ethAmount > 0) {
      fetchPrice();
    }
  }, [ethAmount]);

  return { usdValue, loading, error, refetch: fetchPrice };
};
