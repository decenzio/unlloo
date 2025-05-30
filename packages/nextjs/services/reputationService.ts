import { CombinedData } from "./addressService";

export interface ReputationScore {
  overall: number; // 0-100
  components: {
    accountHistory: number;
    financialCapacity: number;
    transactionBehavior: number;
    defiReputation: number;
    networkTrust: number;
  };
  riskLevel: "Low" | "Medium" | "High";
  recommendations?: string[];
}

export function calculateReputationScore(addressData: CombinedData): ReputationScore {
  const accountHistoryScore = calculateAccountHistoryScore(addressData);
  const financialScore = calculateFinancialScore(addressData);
  const transactionScore = calculateTransactionBehaviorScore(addressData);
  const defiScore = calculateDeFiReputationScore(addressData);
  const trustScore = calculateNetworkTrustScore(addressData);

  const overallScore =
    accountHistoryScore * 0.3 + financialScore * 0.25 + transactionScore * 0.2 + defiScore * 0.15 + trustScore * 0.1;

  let riskLevel: "Low" | "Medium" | "High";
  if (overallScore >= 75) riskLevel = "Low";
  else if (overallScore >= 50) riskLevel = "Medium";
  else riskLevel = "High";

  return {
    overall: Math.round(overallScore),
    components: {
      accountHistory: Math.round(accountHistoryScore),
      financialCapacity: Math.round(financialScore),
      transactionBehavior: Math.round(transactionScore),
      defiReputation: Math.round(defiScore),
      networkTrust: Math.round(trustScore),
    },
    riskLevel,
    recommendations: generateRecommendations(addressData, overallScore),
  };
}

// ------------------ Component Scoring Functions ------------------

function calculateAccountHistoryScore(data: CombinedData): number {
  const ageFactor = Date.now() / 1000 - data.block_number_balance_updated_at;
  const normalized = Math.min(ageFactor / (60 * 60 * 24 * 365), 1); // 1 year max
  return normalized * 100;
}

function calculateFinancialScore(data: CombinedData): number {
  const balance = parseFloat(data.coin_balance || "0");
  const tokensValue = data.tokens.items.reduce((sum, item) => {
    return sum + parseFloat(item.value || "0");
  }, 0);

  const total = balance + tokensValue;
  return Math.min(Math.log10(total + 1) * 20, 100); // Log scale, capped at 100
}

function calculateTransactionBehaviorScore(data: CombinedData): number {
  const txCount = parseInt(data.transactions_count || "0", 10);
  const avgTx = Math.min(txCount / 1000, 1); // normalize by 1000 tx
  return avgTx * 100;
}

function calculateDeFiReputationScore(data: CombinedData): number {
  const defiTokens = data.tokens.items.filter(item => ["ERC-20", "ERC-1155"].includes(item.token.type));
  const hasDefiActivity = defiTokens.length > 0;
  return hasDefiActivity ? 70 + Math.min(defiTokens.length * 5, 30) : 30;
}

function calculateNetworkTrustScore(data: CombinedData): number {
  let score = 50;
  if (data.is_scam) score -= 40;
  if (data.is_verified) score += 30;
  if (data.has_validated_blocks) score += 20;
  return Math.max(0, Math.min(score, 100));
}

// ------------------ Recommendations Generator ------------------

function generateRecommendations(data: CombinedData, score: number): string[] {
  const recommendations: string[] = [];

  if (score < 50) recommendations.push("Increase your ETH balance or token holdings.");
  if (!data.is_verified) recommendations.push("Verify your contract or wallet identity.");
  if (parseInt(data.transactions_count || "0", 10) < 100)
    recommendations.push("Increase your transaction activity for a stronger history.");
  if (!data.has_validated_blocks) recommendations.push("Participate in network validation or staking.");
  if (data.is_scam) recommendations.push("Resolve any scam flags on your address.");

  return recommendations;
}
