import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { fetchAddressData } from "~~/services/addressService";
import { ReputationScore, calculateReputationScore } from "~~/services/reputationService";

export function useReputationScore() {
  const { address, isConnected } = useAccount();
  const [reputationScore, setReputationScore] = useState<ReputationScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isConnected) {
      setReputationScore(null);
      setError(null);
      return;
    }

    const calculateScore = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch the combined data for the address using your service
        const addressData = await fetchAddressData(address);

        console.log("Fetched address data:", addressData); // Debug log

        // Calculate reputation score using your service
        const score = calculateReputationScore(addressData);

        console.log("Calculated reputation score:", score); // Debug log

        setReputationScore(score);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to calculate reputation score";
        setError(errorMessage);
        console.error("Error calculating reputation score:", err);
      } finally {
        setLoading(false);
      }
    };

    calculateScore();
  }, [address, isConnected]);

  return {
    reputationScore,
    loading,
    error,
    refetch: () => {
      if (address && isConnected) {
        setReputationScore(null);
        setError(null);
        // The useEffect will automatically run again
      }
    },
  };
}
