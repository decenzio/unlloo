import { CombinedData } from "./addressService";

export interface ReputationScore {
  overall: number; // 0-100
  components: {
    networkTrust: number;
    transactionBehavior: number; // activity and history
    defiReputation: number;
    daoActivity: number;
    financialCapacity: number; // bags
  };
  ens: boolean;
  wordId: boolean;
  riskLevel: number; // number 1-10 (10 is best)
  recommendations?: string[];
}

export function calculateReputationScore(addressData: CombinedData): ReputationScore {
  try {
    // Calculate individual component scores
    const financialScore = calculateFinancialScore(addressData);
    const transactionScore = calculateTransactionBehaviorScore(addressData);
    const defiScore = calculateDeFiReputationScore(addressData);
    const daoScore = calculateDAOActivityScore(addressData);
    const trustScore = calculateNetworkTrustScore(addressData);

    // Check for identity verification
    const hasENS = !!addressData.ens_domain_name;
    const hasWorldID = checkWorldIDVerification(addressData);

    // Apply weighting to calculate overall score
    const overallScore =
      financialScore * 0.25 + transactionScore * 0.25 + defiScore * 0.2 + daoScore * 0.15 + trustScore * 0.15;

    // Calculate risk level on a scale of 1-10 (10 being best/lowest risk)
    const riskLevel = calculateRiskLevel(overallScore, hasENS, hasWorldID);

    return {
      overall: Math.round(overallScore),
      components: {
        networkTrust: Math.round(trustScore),
        transactionBehavior: Math.round(transactionScore),
        defiReputation: Math.round(defiScore),
        daoActivity: Math.round(daoScore),
        financialCapacity: Math.round(financialScore),
      },
      ens: hasENS,
      wordId: hasWorldID,
      riskLevel,
      recommendations: generateRecommendations(addressData, overallScore, hasENS, hasWorldID),
    };
  } catch (error) {
    console.error("Error calculating reputation score:", error);
    // Return a default score if calculation fails
    return {
      overall: 0,
      components: {
        networkTrust: 0,
        transactionBehavior: 0,
        defiReputation: 0,
        daoActivity: 0,
        financialCapacity: 0,
      },
      ens: false,
      wordId: false,
      riskLevel: 1,
      recommendations: ["Unable to calculate reputation score. Please try again."],
    };
  }
}

// ------------------ Risk Level Calculation ------------------

function calculateRiskLevel(score: number, hasENS: boolean, hasWorldID: boolean): number {
  // Base risk level from score (1-8 scale)
  let riskLevel = Math.round((score / 100) * 8);

  // Bonus points for identity verification
  if (hasENS) riskLevel += 1;
  if (hasWorldID) riskLevel += 1;

  // Ensure we stay within 1-10 range
  return Math.max(1, Math.min(10, riskLevel));
}

// ------------------ Component Scoring Functions ------------------

function calculateFinancialScore(data: CombinedData): number {
  try {
    // Calculate ETH value in USD
    const ethBalance = parseFloat(data.coin_balance || "0");
    const ethInWei = ethBalance / 10 ** 18; // Convert from wei to ETH
    const ethPrice = parseFloat(data.exchange_rate || "0");
    const ethValue = ethInWei * ethPrice;

    // Calculate token values using the new structure
    const tokenValues = (data.tokens?.items || []).reduce((sum, tokenItem) => {
      if (tokenItem?.token?.type === "ERC-20" && tokenItem?.token?.exchange_rate) {
        const tokenDecimals = parseInt(tokenItem.token.decimals || "18", 10);
        const tokenAmount = parseFloat(tokenItem.value || "0") / 10 ** tokenDecimals;
        const tokenPrice = parseFloat(tokenItem.token.exchange_rate || "0");
        return sum + tokenAmount * tokenPrice;
      }
      return sum;
    }, 0);

    // Calculate NFT floor value (estimated) using the new structure
    const nftCount = (data.nfts?.items || []).length;
    const estimatedNftValue = nftCount * 0.1 * ethPrice; // Assume average 0.1 ETH floor

    // Total portfolio value
    const totalValue = ethValue + tokenValues + estimatedNftValue;

    // Logarithmic scale for score (capped at 100)
    // $100 = ~30 points, $1,000 = ~50 points, $10,000 = ~70 points, $100,000+ = ~90+ points
    return Math.min(Math.max(Math.log10(totalValue + 1) * 23, 0), 100);
  } catch (error) {
    console.error("Error calculating financial score:", error);
    return 0;
  }
}

function calculateTransactionBehaviorScore(data: CombinedData): number {
  try {
    const txCount = parseInt(data.transactions_count || "0", 10);
    const transferCount = parseInt(data.token_transfers_count || "0", 10);

    // Score based on transaction history
    // 10 tx = ~25 points, 100 tx = ~50 points, 1000+ tx = ~90+ points
    const txHistoryScore = Math.min(Math.log10(txCount + 1) * 30, 70);

    // Score based on token transfers (shows engagement with ecosystem)
    const transferScore = Math.min(Math.log10(transferCount + 1) * 15, 30);

    return Math.min(txHistoryScore + transferScore, 100);
  } catch (error) {
    console.error("Error calculating transaction behavior score:", error);
    return 0;
  }
}

function calculateDeFiReputationScore(data: CombinedData): number {
  try {
    // Check for key DeFi protocol tokens
    const defiProtocols: string[] = [
      "Aave",
      "Compound",
      "Uniswap",
      "SushiSwap",
      "Curve",
      "Yearn",
      "Maker",
      "Balancer",
      "Synthetix",
      "Bancor",
      "1inch",
      "WETH",
      "DAI",
      "USDC",
      "USDT",
    ];

    // Identify DeFi tokens using the new structure
    const defiTokens = (data.tokens?.items || []).filter(tokenItem =>
      defiProtocols.some(
        protocol => tokenItem?.token?.name?.includes(protocol) || tokenItem?.token?.symbol?.includes(protocol),
      ),
    );

    // Calculate base score from number of DeFi tokens
    let baseScore = Math.min(defiTokens.length * 15, 60);

    // Bonus for holding LP tokens (liquidity provider)
    const hasLPTokens = (data.tokens?.items || []).some(
      tokenItem =>
        tokenItem?.token?.name?.includes("LP") ||
        tokenItem?.token?.symbol?.includes("LP") ||
        tokenItem?.token?.name?.includes("Pool"),
    );

    // Bonus for holding stablecoin positions
    const hasStables = (data.tokens?.items || []).some(tokenItem =>
      ["DAI", "USDC", "USDT", "BUSD", "FRAX", "LUSD"].includes(tokenItem?.token?.symbol || ""),
    );

    // Add bonuses
    if (hasLPTokens) baseScore += 20;
    if (hasStables) baseScore += 20;

    return Math.min(baseScore, 100);
  } catch (error) {
    console.error("Error calculating DeFi reputation score:", error);
    return 0;
  }
}

function calculateDAOActivityScore(data: CombinedData): number {
  try {
    // Check for governance tokens
    const governanceProtocols: string[] = [
      "DAO",
      "Governance",
      "Vote",
      "ENS",
      "Gitcoin",
      "GTC",
      "UNI",
      "COMP",
      "AAVE",
      "MKR",
    ];

    // Identify governance tokens using the new structure
    const govTokens = (data.tokens?.items || []).filter(tokenItem =>
      governanceProtocols.some(
        protocol => tokenItem?.token?.name?.includes(protocol) || tokenItem?.token?.symbol?.includes(protocol),
      ),
    );

    // Check for NFTs that might be related to DAOs using the new structure
    const daoNfts = (data.nfts?.items || []).filter(
      nftItem =>
        nftItem?.token?.name?.includes("DAO") ||
        nftItem?.metadata?.name?.includes("DAO") ||
        nftItem?.token?.name?.includes("Governance"),
    );

    // Base score from identified tokens and NFTs
    const baseScore = Math.min(govTokens.length * 15 + daoNfts.length * 10, 70);

    // Bonus for ENS ownership (often used for DAO voting)
    const ensBonus = data.ens_domain_name ? 30 : 0;

    return Math.min(baseScore + ensBonus, 100);
  } catch (error) {
    console.error("Error calculating DAO activity score:", error);
    return 0;
  }
}

function calculateNetworkTrustScore(data: CombinedData): number {
  try {
    let score = 50; // Start at neutral

    // Major penalties
    if (data.is_scam) score -= 40;

    // Bonuses
    if (data.is_verified) score += 20;
    if (data.ens_domain_name) score += 15;
    if (data.has_validated_blocks) score += 25;

    // Bonus for account activity
    const txCount = parseInt(data.transactions_count || "0", 10);
    if (txCount > 500) score += 15;
    else if (txCount > 50) score += 10;

    // Reputation from token diversity using the new structure
    const uniqueTokens = new Set((data.tokens?.items || []).map(tokenItem => tokenItem?.token?.address)).size;
    score += Math.min(uniqueTokens * 2, 15);

    // Bonus for contract interaction (if it's a contract)
    if (data.is_contract) score += 10;

    // Bonus for having logs (shows active usage)
    if (data.has_logs) score += 5;

    // Cap at 0-100
    return Math.max(0, Math.min(score, 100));
  } catch (error) {
    console.error("Error calculating network trust score:", error);
    return 50;
  }
}

// ------------------ Helper Functions ------------------

function checkWorldIDVerification(data: CombinedData): boolean {
  try {
    // Check for WorldID related tokens using the new structure
    return (data.tokens?.items || []).some(
      tokenItem =>
        tokenItem?.token?.name?.includes("World") ||
        tokenItem?.token?.name?.includes("Proof") ||
        tokenItem?.token?.symbol?.includes("WLD"),
    );
  } catch (error) {
    console.error("Error checking WorldID verification:", error);
    return false;
  }
}

// ------------------ Recommendations Generator ------------------

function generateRecommendations(data: CombinedData, score: number, hasENS: boolean, hasWorldID: boolean): string[] {
  const recommendations: string[] = [];

  try {
    // Financial recommendations
    const ethBalance = parseFloat(data.coin_balance || "0") / 10 ** 18;
    if (ethBalance < 0.1) {
      recommendations.push("Consider increasing your ETH balance to improve your financial capacity score.");
    }

    // Transaction behavior recommendations
    const txCount = parseInt(data.transactions_count || "0", 10);
    if (txCount < 50) {
      recommendations.push("Build a longer transaction history to establish reliability on-chain.");
    }

    // DeFi reputation recommendations
    const defiTokenCount = (data.tokens?.items || []).filter(tokenItem =>
      ["Aave", "Compound", "Uniswap", "WETH", "DAI"].some(
        name => tokenItem?.token?.name?.includes(name) || tokenItem?.token?.symbol?.includes(name),
      ),
    ).length;

    if (defiTokenCount < 2) {
      recommendations.push(
        "Participate in reputable DeFi protocols (like Uniswap, Aave, or Compound) to build financial reputation.",
      );
    }

    // DAO activity recommendations
    const hasGovTokens = (data.tokens?.items || []).some(tokenItem =>
      ["DAO", "Governance", "Vote", "UNI", "COMP", "AAVE"].some(
        term => tokenItem?.token?.name?.includes(term) || tokenItem?.token?.symbol?.includes(term),
      ),
    );

    if (!hasGovTokens) {
      recommendations.push("Participate in DAOs or governance protocols to demonstrate community involvement.");
    }

    // Token diversity recommendations
    const tokenCount = (data.tokens?.items || []).length;
    if (tokenCount < 5) {
      recommendations.push("Diversify your token portfolio to show broader ecosystem engagement.");
    }

    // Identity recommendations
    if (!hasENS) {
      recommendations.push("Register an ENS domain to establish a verifiable on-chain identity.");
    }

    if (!hasWorldID) {
      recommendations.push("Consider verifying your identity with WorldID to increase trust signals.");
    }

    // Trust recommendations
    if (data.is_scam) {
      recommendations.push("Address any scam flags on your account by contacting relevant platforms.");
    }

    // Activity recommendations
    if (!data.has_logs) {
      recommendations.push("Increase your on-chain activity by interacting with dApps and protocols.");
    }

    // Overall score recommendations
    if (score < 30) {
      recommendations.push(
        "Focus on building your on-chain presence through regular transactions and DeFi participation.",
      );
    } else if (score < 60) {
      recommendations.push(
        "Consider diversifying into governance tokens and DAO participation to boost your reputation.",
      );
    } else {
      recommendations.push("Excellent reputation! Consider mentoring others in the Web3 community.");
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return ["Unable to generate personalized recommendations at this time."];
  }
}
