import { useEffect, useState } from "react";

export const useUnlooToUsd = (unlooAmount: number) => {
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    if (unlooAmount <= 0) {
      setUsdValue(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Fetching UNLOO price for amount:", unlooAmount);

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // You'll need to implement your UNLOO price API endpoint
      const response = await fetch("/api/v1/price/unloo", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If API doesn't exist yet, use a mock price for development
        console.warn("UNLOO price API not found, using mock price");
        const mockPrice = 0.05; // $0.05 per UNLOO token
        const calculatedUsdValue = mockPrice * unlooAmount;
        setUsdValue(calculatedUsdValue);
        return;
      }

      const data = await response.json();
      console.log("UNLOO price response:", data);

      const price = parseFloat(data.price || data.usd_price || data.coin_price);

      if (isNaN(price)) {
        throw new Error("Invalid price data received");
      }

      const calculatedUsdValue = price * unlooAmount;
      console.log("Calculated UNLOO USD value:", calculatedUsdValue);

      setUsdValue(calculatedUsdValue);
      setError(null);
    } catch (err) {
      console.error("Error in useUnlooToUsd:", err);
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timeout - please try again");
      } else {
        // For development, use mock price if API fails
        console.warn("UNLOO price fetch failed, using mock price");
        const mockPrice = 0.05; // $0.05 per UNLOO token
        const calculatedUsdValue = mockPrice * unlooAmount;
        setUsdValue(calculatedUsdValue);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlooAmount >= 0) {
      fetchPrice();
    } else {
      setUsdValue(null);
      setLoading(false);
      setError(null);
    }
  }, [unlooAmount]);

  return { usdValue, loading, error, refetch: fetchPrice };
};
