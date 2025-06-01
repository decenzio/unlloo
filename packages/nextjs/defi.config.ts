export const DEFI_CONFIG = {
  BORROWING_CAP_USD: 1.5,
  SIMULATION_DAYS: 7,
  TRANSACTION_TIMEOUT_MS: 60000,
  RETRY_ATTEMPTS: 3,

  // APR configurations
  SIMULATED_APRS: {
    USDC: 1000, // 10%
    WETH: 800, // 8%
    WBTC: 900, // 9%
    UNLOO: 750, // 7.5%
  },

  // Network configurations
  BLOCK_CONFIRMATIONS: 1,

  // UI configurations
  LOADING_TIMEOUT_MS: 10000,
  PRICE_UPDATE_INTERVAL_MS: 30000,
} as const;
