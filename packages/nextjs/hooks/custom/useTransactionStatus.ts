import { useCallback, useState } from "react";

interface TransactionState {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
}

export const useTransactionStatus = () => {
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    error: null,
    txHash: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setSuccess = useCallback((txHash: string) => {
    setState({ isLoading: false, error: null, txHash });
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, txHash: null });
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    reset,
  };
};
