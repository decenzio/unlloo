import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { normalize } from "viem/ens";
import { useAccount, useEnsAvatar, useEnsName } from "wagmi";
import {
  ArrowUpIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MapIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import { CheckCircleIcon, StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useReputationScore } from "~~/hooks/custom/useReputationScore";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

// Constants
const LOADING_TIMEOUT_MS = 10000;
const LEVEL_THRESHOLDS = {
  LEGENDARY: 90,
  EXPERT: 70,
  ADVANCED: 50,
  INTERMEDIATE: 30,
  NEWCOMER: 0,
} as const;

const BORROWING_LIMITS = {
  ALPHA_VERSION: 1.5,
  PRODUCTION_MULTIPLIER: 0.1, // Future: borrowLimit = score * multiplier
} as const;

// Types
interface ReputationMetric {
  label: string;
  score: number;
  color: string;
  bgColor: string;
  progressColor: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface LeaderboardUser {
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

interface ReputationDashboardProps {
  leaderboard?: LeaderboardUser[];
}

interface ReputationScoreData {
  overall: number;
  riskLevel: number;
  ens?: boolean;
  wordId?: boolean;
  components: {
    transactionBehavior: number;
    defiReputation: number;
    daoActivity: number;
    financialCapacity: number;
  };
  recommendations?: string[];
}

interface LevelInfo {
  level: number;
  title: string;
  progress: number;
  nextLevelAt?: number;
  pointsToNext?: number;
}

interface Achievement {
  key: string;
  label: string;
  description?: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

// Logging utility
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[ReputationDashboard] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ReputationDashboard] ${error}`);
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[ReputationDashboard] ${message}`, data);
    }
  },
};

// Enhanced achievements with descriptions and rarity
const SPECIFIC_ACHIEVEMENTS: Achievement[] = [
  {
    key: "ens",
    label: "ENS Domain Owner",
    description: "You own an ENS domain name",
    rarity: "rare",
  },
  {
    key: "wordId",
    label: "WorldID Verified",
    description: "Verified human identity through WorldID",
    rarity: "epic",
  },
];

const DEFAULT_LEADERBOARD: LeaderboardUser[] = [
  { name: "Philip", score: 8.21 },
  { name: "Ellen", score: 3.5 },
];

// Enhanced helper function to get level information
const getLevelInfo = (score: number): LevelInfo => {
  const levels = [
    { threshold: LEVEL_THRESHOLDS.LEGENDARY, title: "LEGENDARY", level: 5 },
    { threshold: LEVEL_THRESHOLDS.EXPERT, title: "EXPERT", level: 4 },
    { threshold: LEVEL_THRESHOLDS.ADVANCED, title: "ADVANCED", level: 3 },
    { threshold: LEVEL_THRESHOLDS.INTERMEDIATE, title: "INTERMEDIATE", level: 2 },
    { threshold: LEVEL_THRESHOLDS.NEWCOMER, title: "NEWCOMER", level: 1 },
  ];

  for (let i = 0; i < levels.length; i++) {
    const currentLevel = levels[i];
    const nextLevel = levels[i - 1];

    if (score >= currentLevel.threshold) {
      const progressStart = currentLevel.threshold;
      const progressEnd = nextLevel?.threshold || 100;
      const progress = nextLevel ? ((score - progressStart) / (progressEnd - progressStart)) * 100 : 100;

      return {
        level: currentLevel.level,
        title: currentLevel.title,
        progress: Math.min(progress, 100),
        nextLevelAt: nextLevel?.threshold,
        pointsToNext: nextLevel ? Math.max(0, nextLevel.threshold - score) : 0,
      };
    }
  }

  // Fallback for scores below 0
  return {
    level: 1,
    title: "NEWCOMER",
    progress: Math.max(0, (score / LEVEL_THRESHOLDS.INTERMEDIATE) * 100),
    nextLevelAt: LEVEL_THRESHOLDS.INTERMEDIATE,
    pointsToNext: Math.max(0, LEVEL_THRESHOLDS.INTERMEDIATE - score),
  };
};

// Enhanced function to convert reputation score to dashboard metrics
const convertToReputationMetrics = (reputationScore: ReputationScoreData): ReputationMetric[] => {
  return [
    {
      label: "Onchain Activity",
      score: reputationScore.components.transactionBehavior,
      color: "text-green-600",
      bgColor: "bg-green-100",
      progressColor: "#10B981",
    },
    {
      label: "DeFi",
      score: reputationScore.components.defiReputation,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      progressColor: "#3B82F6",
    },
    {
      label: "Governance",
      score: reputationScore.components.daoActivity,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      progressColor: "#8B5CF6",
    },
    {
      label: "Assets",
      score: reputationScore.components.financialCapacity,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      progressColor: "#F59E0B",
    },
    {
      label: "POAPs",
      score: 0, // Placeholder for future implementation
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      progressColor: "#EC4899",
    },
    {
      label: "Network",
      score: 0, // Placeholder for future implementation
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      progressColor: "#F97316",
    },
  ];
};

// Custom hooks
const useLoadingTimeout = (isLoading: boolean, timeoutMs: number = LOADING_TIMEOUT_MS) => {
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (isLoading) {
        setIsTimedOut(true);
        logger.warn("Loading timeout reached");
      }
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return isTimedOut;
};

const useReputationCalculations = (reputationScore: ReputationScoreData | null, isConnected: boolean) => {
  return useMemo(() => {
    if (!reputationScore) {
      return {
        overallScore: 0,
        levelInfo: getLevelInfo(0),
        reputationMetrics: [],
        achievements: [],
        borrowingLimit: BORROWING_LIMITS.ALPHA_VERSION,
      };
    }

    const levelInfo = getLevelInfo(reputationScore.overall);
    const reputationMetrics = convertToReputationMetrics(reputationScore);

    // Calculate achievements based on real data
    const achievements: string[] = [];
    if (reputationScore.ens) achievements.push("ENS Domain Owner");
    if (reputationScore.wordId) achievements.push("WorldID Verified");

    // Future: Dynamic borrowing limit based on score
    const borrowingLimit =
      process.env.NODE_ENV === "production"
        ? Math.max(BORROWING_LIMITS.ALPHA_VERSION, reputationScore.overall * BORROWING_LIMITS.PRODUCTION_MULTIPLIER)
        : BORROWING_LIMITS.ALPHA_VERSION;

    return {
      overallScore: reputationScore.overall,
      levelInfo,
      reputationMetrics,
      achievements,
      borrowingLimit,
    };
  }, [reputationScore, isConnected]);
};

// Enhanced Info Card Component
const InfoCard = React.memo(({ label, content, onClose }: { label: string; content: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: -10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, y: -10 }}
    transition={{ duration: 0.2 }}
    className="absolute z-50 top-0 left-1/2 -translate-x-1/2 bg-white border border-indigo-100 rounded-lg shadow-lg p-3 w-48 text-xs text-gray-700"
  >
    <div className="flex items-center justify-between mb-1">
      <div className="font-semibold">{label}</div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close info">
        ×
      </button>
    </div>
    <div className="text-gray-600">{content}</div>
  </motion.div>
));

InfoCard.displayName = "InfoCard";

// Enhanced Metric Card Component
const MetricCard = React.memo(
  ({
    metric,
    onInfoToggle,
    showInfo,
    infoContent,
  }: {
    metric: ReputationMetric;
    onInfoToggle: (label: string) => void;
    showInfo: boolean;
    infoContent: string;
  }) => {
    const { label, score, color, bgColor, progressColor } = metric;

    return (
      <motion.div
        variants={{
          hidden: { y: 20, opacity: 0 },
          visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
        }}
        className="relative flex flex-col items-center bg-white rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <div className={`w-24 h-24 ${bgColor} rounded-full flex items-center justify-center p-2.5 mb-3`}>
          <CircularProgressbar
            value={score}
            maxValue={100}
            text={`${score}`}
            styles={buildStyles({
              textSize: "28px",
              textColor: color.replace("text-", "#").replace("-600", ""),
              pathColor: progressColor,
              trailColor: "rgba(229, 231, 235, 0.8)",
              strokeLinecap: "round",
              pathTransitionDuration: 0.8,
            })}
          />
        </div>
        <div className="flex flex-col items-center">
          <div className={`font-bold text-base ${color} flex items-center gap-1`}>
            {label}
            <button
              type="button"
              aria-label={`Info about ${label}`}
              onClick={() => onInfoToggle(label)}
              className="ml-1 cursor-pointer hover:text-indigo-600 transition-colors"
            >
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          </div>
          <AnimatePresence>
            {showInfo && <InfoCard label={label} content={infoContent} onClose={() => onInfoToggle(label)} />}
          </AnimatePresence>
          <div className="text-xs text-gray-500 mt-1">
            {score < 30 ? "Building" : score < 60 ? "Advancing" : "Expert"}
          </div>
        </div>
      </motion.div>
    );
  },
);

MetricCard.displayName = "MetricCard";

// Main Component
export default function ReputationDashboard({ leaderboard = DEFAULT_LEADERBOARD }: ReputationDashboardProps) {
  logger.info("Component render started");

  // Wallet and network information
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
    query: {
      enabled: Boolean(ensName),
      gcTime: 30_000,
    },
  });
  const { targetNetwork } = useTargetNetwork();

  // Reputation data
  const { reputationScore, loading, error, refetch } = useReputationScore();

  // Component state
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for loading timeout
  const isLoadingTimedOut = useLoadingTimeout(loading);

  // Memoized calculations
  const blockExplorerAddressLink = useMemo(() => {
    return address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;
  }, [address, targetNetwork]);

  const displayName = useMemo(() => {
    return ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Guest");
  }, [ensName, address]);

  const { overallScore, levelInfo, reputationMetrics, achievements, borrowingLimit } = useReputationCalculations(
    reputationScore,
    isConnected,
  );

  const updatedLeaderboard = useMemo(() => {
    if (!reputationScore || !isConnected) return leaderboard;

    return [
      ...leaderboard,
      {
        name: displayName,
        score: reputationScore.riskLevel,
        isCurrentUser: true,
      },
    ].sort((a, b) => b.score - a.score);
  }, [leaderboard, reputationScore, isConnected, displayName]);

  // Info texts for each metric
  const metricInfo: Record<string, string> = useMemo(
    () => ({
      "Onchain Activity":
        "Reflects your on-chain activity and longevity. The higher, the more established your address.",
      DeFi: "Shows your engagement with DeFi protocols. Interact with DeFi to grow this score.",
      Governance: "Measures your participation in DAOs and governance. Get involved to increase it.",
      Assets: "Represents your wallet diversity and asset holdings. More variety and value means a higher score.",
      POAPs: "COMING SOON — Counts your POAPs, showcasing your participation in events and communities.",
      Network: "COMING SOON — Indicates your network strength and connections with other users.",
    }),
    [],
  );

  // Animation variants
  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 },
      },
    }),
    [],
  );

  const itemVariants = useMemo(
    () => ({
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 },
      },
    }),
    [],
  );

  // Event handlers
  const handleInfoToggle = useCallback(
    (label: string) => {
      setOpenInfo(openInfo === label ? null : label);
    },
    [openInfo],
  );

  const handleRetry = useCallback(() => {
    if (refetch) {
      refetch();
    }
  }, [refetch]);

  // Loading state
  if (loading) {
    return (
      <div className="text-black w-full font-sans">
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating your reputation score...</p>
          <div className="text-xs text-gray-400 mt-2 max-w-md text-center">
            Analyzing your Web3 activity and reputation metrics...
            {isMounted && (
              <>
                <br />
                Current time: {new Date().toLocaleTimeString()}
              </>
            )}
          </div>

          {isLoadingTimedOut && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              ⚠️ Loading is taking longer than expected. Please check your connection.
            </div>
          )}

          {/* Debug info only in development */}
          {process.env.NODE_ENV === "development" && isMounted && (
            <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-2 rounded max-w-lg">
              <div>Status: Loading reputation data...</div>
              <div>Connected: {isConnected ? "Yes" : "No"}</div>
              <div>Address: {address || "None"}</div>
              {error && <div className="text-red-600">Error: {error}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-black w-full font-sans">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-medium text-red-800">Error Loading Reputation</h3>
          </div>
          <p className="text-red-700 mb-3">Error: {error}</p>
          <button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-black w-full font-sans">
      {/* Development Debug Panel */}
      {process.env.NODE_ENV === "development" && isMounted && (
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs">
          <details>
            <summary className="font-medium cursor-pointer">🐛 Debug Info (Development Only)</summary>
            <div className="mt-2 space-y-1">
              <div>
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </div>
              <div>
                <strong>Overall Score:</strong> {overallScore}
              </div>
              <div>
                <strong>Level:</strong> {levelInfo.level} - {levelInfo.title}
              </div>
              <div>
                <strong>Progress:</strong> {levelInfo.progress.toFixed(1)}%
              </div>
              <div>
                <strong>Borrowing Limit:</strong> ${borrowingLimit.toFixed(2)}
              </div>
              <div>
                <strong>Achievements:</strong> {achievements.length}
              </div>
              <div>
                <strong>Connected:</strong> {isConnected ? "Yes" : "No"}
              </div>
              <div>
                <strong>Address:</strong> {address || "None"}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Enhanced Welcome Banner */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full flex flex-col justify-between gap-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-xl px-6 py-5 mb-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3">
          {isConnected && address ? (
            <div className="flex flex-col items-start flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <BlockieAvatar address={address} size={40} ensImage={ensAvatar} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <div className="text-3xl font-bold text-indigo-700">{displayName}</div>
                  {blockExplorerAddressLink && (
                    <a
                      href={blockExplorerAddressLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 ml-2 transition-colors"
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <UserIcon className="w-8 h-8" />
              <h2 className="text-xl font-semibold">
                Welcome to <span className="font-bold text-indigo-700">Unlloo</span>!
              </h2>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6 mb-3 w-full">
          {/* Enhanced Level Display */}
          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-3xl flex items-center justify-center shadow flex-shrink-0">
            {String(levelInfo.level).padStart(2, "0")}
          </div>

          {/* Enhanced Level Info & Progress Bar */}
          <div className="flex-1 flex flex-col justify-center w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-lg font-bold text-indigo-800">{levelInfo.title}</div>
              {levelInfo.nextLevelAt && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {levelInfo.pointsToNext} pts to next level
                </span>
              )}
            </div>
            <div className="">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{Math.round(levelInfo.progress)}%</span>
                {levelInfo.nextLevelAt && <span className="text-xs">Next: {levelInfo.nextLevelAt} pts</span>}
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-indigo-600">
              <ArrowUpIcon className="w-4 h-4" />
              <span>Be more Web3 active to improve your reputation</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      {(!isConnected || reputationScore) && (
        <>
          {/* Enhanced Overall Score & Level Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5"
          >
            {/* Overall Score */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckBadgeIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-lg font-medium text-green-400 flex items-center">Overall Score</span>
              </div>
              <div className="w-32 h-32 mb-3">
                <CircularProgressbar
                  value={overallScore}
                  maxValue={100}
                  text={`${overallScore}`}
                  styles={buildStyles({
                    textSize: "28px",
                    pathColor: `rgba(101, 116, 205, ${overallScore / 100})`,
                    textColor: "#4338CA",
                    trailColor: "#E5E7EB",
                    pathTransitionDuration: 1,
                  })}
                />
              </div>
              <div className="text-sm text-center text-gray-600">
                {overallScore < 30
                  ? "Building reputation..."
                  : overallScore < 60
                    ? "Good standing!"
                    : "Excellent reputation!"}
              </div>
            </motion.div>

            {/* Enhanced Max Borrow */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                <CurrencyDollarIcon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span className="text-lg font-medium text-indigo-600 flex items-center">Max Borrow</span>
              </div>
              <div className="text-2xl font-bold text-indigo-700 mb-1">
                ${borrowingLimit.toFixed(2)}
                <small className="text-xs text-gray-400 ml-2">
                  {process.env.NODE_ENV === "production" ? "(Dynamic)" : "(Alpha limit)"}
                </small>
              </div>
              <div className="text-sm text-gray-600">
                Your current maximum borrow limit based on your reputation score.
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-indigo-600">
                <ArrowUpIcon className="w-4 h-4" />
                <span>Increase your score to raise this limit</span>
              </div>
            </motion.div>

            {/* Enhanced Achievements section */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-4 text-amber-600 font-semibold">
                <TrophyIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-lg flex items-center">Achievements</span>
              </div>

              <ul className="space-y-3">
                {SPECIFIC_ACHIEVEMENTS.map(ach => {
                  let hasAchievement = false;
                  if (ach.key === "ens") hasAchievement = !!reputationScore?.ens;
                  if (ach.key === "wordId") hasAchievement = !!reputationScore?.wordId;
                  if (ach.key === "defi") hasAchievement = (reputationScore?.components?.defiReputation ?? 0) > 50;

                  return (
                    <li key={ach.key} className="flex items-center gap-2 text-sm group">
                      {hasAchievement ? (
                        <span className="w-6 h-6 flex items-center justify-center rounded bg-amber-100">
                          <StarSolidIcon className="w-5 h-5 text-amber-400" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 bg-white" />
                      )}
                      <div className="flex flex-col">
                        <span className={`font-medium ${hasAchievement ? "text-gray-800" : "text-gray-400"}`}>
                          {ach.label}
                        </span>
                        {ach.description && <span className="text-xs text-gray-500">{ach.description}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Additional achievements */}
              {achievements.length > 0 && (
                <ul className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                  {achievements
                    .filter(a => !SPECIFIC_ACHIEVEMENTS.some(s => s.label === a))
                    .map(achievement => (
                      <li key={achievement} className="flex items-center gap-2 text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        <span className="font-medium">{achievement}</span>
                      </li>
                    ))}
                </ul>
              )}

              <Link
                href="/achievements"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-4 inline-block transition-colors"
              >
                View all achievements →
              </Link>
            </motion.div>
          </motion.div>

          {/* Enhanced Reputation Metrics */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-5 bg-white rounded-xl p-6 shadow-md border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-6 text-gray-800">
              <ChartBarIcon className="w-6 h-6 text-indigo-600 flex-shrink-0" />
              <span className="text-xl font-bold flex items-center">Reputation Metrics</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {reputationMetrics.map(metric => (
                <MetricCard
                  key={metric.label}
                  metric={metric}
                  onInfoToggle={handleInfoToggle}
                  showInfo={openInfo === metric.label}
                  infoContent={metricInfo[metric.label] || "No information available"}
                />
              ))}
            </div>
          </motion.div>

          {/* Quest / Recommendations Section */}
          {reputationScore?.recommendations && reputationScore.recommendations.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-10 bg-white rounded-xl p-6 shadow-md border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-4 text-blue-600 font-semibold">
                <MapIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xl font-bold text-gray-800 flex items-center">Your Quests</span>
              </div>
              <ul className="space-y-3">
                {reputationScore.recommendations.map((recommendation, index) => (
                  <motion.li
                    key={index}
                    variants={itemVariants}
                    className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mt-0.5">
                      <SparklesIcon className="w-5 h-5" />
                    </span>
                    <span className="text-sm text-blue-900">{recommendation}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Enhanced Super Heroes Leaderboard */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white border rounded-xl p-5 shadow-sm mb-8"
          >
            <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold">
              <StarIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-lg flex items-center">Super Heroes Leaderboard</span>
            </div>
            <ol className="text-sm text-gray-700 space-y-3">
              {updatedLeaderboard.map((user, index) => (
                <motion.li
                  key={`${user.name}-${user.score}`}
                  variants={itemVariants}
                  className={`flex justify-between items-center p-2 rounded transition-colors ${
                    user.isCurrentUser ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-800"
                          : index === 1
                            ? "bg-gray-100 text-gray-800"
                            : index === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className={`font-medium ${user.isCurrentUser ? "text-indigo-700" : ""}`}>{user.name}</span>
                    {user.isCurrentUser && (
                      <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded">You</span>
                    )}
                  </div>
                  <span className="font-semibold">{user.score.toFixed(2)}</span>
                </motion.li>
              ))}
            </ol>
            <div className="mt-4 text-center">
              <Link
                href="/leaderboard"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                View full leaderboard →
              </Link>
            </div>
          </motion.div>

          {/* Enhanced Tips & Next Steps */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center">
            <motion.p variants={itemVariants} className="text-sm text-gray-600 max-w-md mx-auto">
              <small>Level up to unlock new perks, badges, and on-chain reputation power.</small>
              <br />
              <Link
                href="/improve-score"
                className="text-indigo-600 hover:underline font-medium mt-2 inline-block transition-colors"
              >
                How to improve your score →
              </Link>
            </motion.p>
          </motion.div>
        </>
      )}
    </div>
  );
}
