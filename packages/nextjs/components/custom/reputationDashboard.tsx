import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { normalize } from "viem/ens";
import { useAccount, useEnsAvatar, useEnsName } from "wagmi";
import { ArrowUpIcon, ChartBarIcon, StarIcon, TrophyIcon, UserIcon } from "@heroicons/react/24/solid";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useReputationScore } from "~~/hooks/custom/useReputationScore";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

interface ReputationMetric {
  label: string;
  score: number;
  color: string;
  bgColor: string;
  progressColor: string;
}

interface LeaderboardUser {
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

interface ReputationDashboardProps {
  leaderboard?: LeaderboardUser[];
}

// Define the structure of reputation score data
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

// Helper function to get level information based on score
const getLevelInfo = (score: number) => {
  if (score >= 90) return { level: 5, title: "LEGENDARY", progress: 100 };
  if (score >= 70) return { level: 4, title: "EXPERT", progress: ((score - 70) / 20) * 100 };
  if (score >= 50) return { level: 3, title: "ADVANCED", progress: ((score - 50) / 20) * 100 };
  if (score >= 30) return { level: 2, title: "INTERMEDIATE", progress: ((score - 30) / 20) * 100 };
  return { level: 1, title: "NEWCOMER", progress: (score / 30) * 100 };
};

// Helper function to convert reputation score to dashboard metrics
const convertToReputationMetrics = (reputationScore: ReputationScoreData): ReputationMetric[] => {
  return [
    {
      label: "HISTORY",
      score: reputationScore.components.transactionBehavior,
      color: "text-green-600",
      bgColor: "bg-green-100",
      progressColor: "#10B981",
    },
    {
      label: "DEFI",
      score: reputationScore.components.defiReputation,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      progressColor: "#3B9FF6FF",
    },
    {
      label: "DAO",
      score: reputationScore.components.daoActivity,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      progressColor: "#8B5CF6",
    },
    {
      label: "BAGS",
      score: reputationScore.components.financialCapacity,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      progressColor: "#F59E0B",
    },
  ];
};

const DEFAULT_LEADERBOARD: LeaderboardUser[] = [
  { name: "Philip", score: 8.21 },
  { name: "Ellen", score: 3.5 },
];

export default function ReputationDashboard({ leaderboard = DEFAULT_LEADERBOARD }: ReputationDashboardProps) {
  // Get wallet information using wagmi hooks
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

  // Use the reputation score hook
  const { reputationScore, loading, error, refetch } = useReputationScore();

  // Info card state for metrics
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  // Generate block explorer link based on address and current network
  const blockExplorerAddressLink = useMemo(() => {
    return address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;
  }, [address, targetNetwork]);

  // Display name fallback logic
  const displayName = useMemo(() => {
    return ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Guest");
  }, [ensName, address]);

  // Calculate derived values from reputation score
  const derivedValues = useMemo(() => {
    if (!reputationScore) {
      return {
        overallScore: 0,
        levelInfo: { level: 1, title: "NEWCOMER", progress: 0 },
        reputationMetrics: [],
        achievements: [],
      };
    }

    const levelInfo = getLevelInfo(reputationScore.overall);
    const reputationMetrics = convertToReputationMetrics(reputationScore);

    // Calculate achievements based on real data
    const achievements: string[] = [];
    if (reputationScore.ens) achievements.push("ENS Domain Owner");
    if (reputationScore.wordId) achievements.push("WorldID Verified");
    if (reputationScore.overall > 70) achievements.push("High Reputation");
    if (reputationScore.components.defiReputation > 50) achievements.push("DeFi Enthusiast");
    if (reputationScore.components.daoActivity > 50) achievements.push("DAO Participant");
    if (reputationScore.riskLevel >= 8) achievements.push("Low Risk Profile");

    return {
      overallScore: reputationScore.overall,
      levelInfo,
      reputationMetrics,
      achievements,
    };
  }, [reputationScore]);

  // Extract level information for easy access
  const { level, title: levelTitle, progress: levelProgress } = derivedValues.levelInfo;

  // Update leaderboard to include current user
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

  // Info texts for each metric
  const metricInfo: Record<string, string> = useMemo(
    () => ({
      HISTORY: "Reflects your on-chain activity and longevity. The higher, the more established your address.",
      DEFI: "Shows your engagement with DeFi protocols. Interact with DeFi to grow this score.",
      DAO: "Measures your participation in DAOs and governance. Get involved to increase it.",
      BAGS: "Represents your wallet diversity and asset holdings. More variety and value means a higher score.",
    }),
    [],
  );

  // Memoized click handlers
  const handleInfoToggle = useCallback(
    (label: string) => {
      setOpenInfo(openInfo === label ? null : label);
    },
    [openInfo],
  );

  const handleInfoClose = useCallback(() => {
    setOpenInfo(null);
  }, []);

  const handleRetry = useCallback(() => {
    if (refetch) {
      refetch();
    }
  }, [refetch]);

  // @ts-ignore
  return (
    <div className="text-black w-full font-sans">
      {/* Welcome Banner */}
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
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 ml-2"
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
          {/* Level Number (left) */}
          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-3xl flex items-center justify-center shadow flex-shrink-0">
            {String(level).padStart(2, "0")}
          </div>

          {/* Level Info & Progress Bar (right) */}
          <div className="flex-1 flex flex-col justify-center w-full">
            <div className="text-lg font-bold text-indigo-800">{levelTitle}</div>
            <div className="">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{Math.round(levelProgress)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
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

        {/* Status Messages */}
        {loading && (
          <div className="text-center">
            <span className="text-xs text-indigo-600">Loading reputation...</span>
          </div>
        )}
        {error && (
          <div className="text-center">
            <button onClick={handleRetry} className="text-xs text-red-600 hover:text-red-800 font-medium underline">
              Retry
            </button>
          </div>
        )}
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating your reputation score...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">Error: {error}</p>
          <button onClick={handleRetry} className="mt-2 text-red-600 hover:text-red-800 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {/* Main Content - Only show if we have data or user is not connected */}
      {(!isConnected || reputationScore) && (
        <>
          {/* Overall Score & Level Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5"
          >
            {/* Overall Score */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center bg-white rounded-xl p-5 shadow-sm border"
            >
              <h3 className="text-lg font-medium text-gray-700 mb-3">Overall Score</h3>
              <div className="w-32 h-32 mb-3">
                <CircularProgressbar
                  value={derivedValues.overallScore}
                  maxValue={100}
                  text={`${derivedValues.overallScore}`}
                  styles={buildStyles({
                    textSize: "28px",
                    pathColor: `rgba(101, 116, 205, ${derivedValues.overallScore / 100})`,
                    textColor: "#4338CA",
                    trailColor: "#E5E7EB",
                    pathTransitionDuration: 1,
                  })}
                />
              </div>
              <div className="text-sm text-center text-gray-600">
                {derivedValues.overallScore < 30
                  ? "Building reputation..."
                  : derivedValues.overallScore < 60
                    ? "Good standing!"
                    : "Excellent reputation!"}
              </div>
            </motion.div>

            {/* Max Borrow */}
            <motion.div variants={itemVariants} className="flex flex-col bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center gap-4 mb-3">
                <ChartBarIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-medium text-gray-700">Max Borrow</h3>
              </div>
              <div className="text-2xl font-bold text-indigo-700 mb-2">$1,500</div>
              <div className="text-sm text-gray-600">
                Your current maximum borrow limit based on your reputation score.
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-indigo-600">
                <ArrowUpIcon className="w-4 h-4" />
                <span>Increase your score to raise this limit</span>
              </div>
            </motion.div>

            {/* Achievements section */}
            <motion.div variants={itemVariants} className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center gap-2 mb-4 text-amber-600 font-semibold">
                <TrophyIcon className="w-5 h-5" />
                <h3 className="text-lg">Achievements</h3>
              </div>

              {derivedValues.achievements.length > 0 ? (
                <ul className="space-y-3">
                  {derivedValues.achievements.map(achievement => (
                    <li key={achievement} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span className="font-medium">{achievement}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500 italic">Complete activities to earn achievements!</div>
              )}

              <Link
                href="/achievements"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-4 inline-block"
              >
                View all achievements →
              </Link>
            </motion.div>
          </motion.div>

          {/* Reputation Metrics */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-5 bg-white rounded-xl p-6 shadow-md border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-6 text-gray-800">
              <ChartBarIcon className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold">Reputation Metrics</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {derivedValues.reputationMetrics.map(({ label, score, color, bgColor, progressColor }) => (
                <motion.div
                  key={label}
                  variants={itemVariants}
                  className="relative flex flex-col items-center bg-white rounded-xl p-4 shadow-sm transition-shadow duration-200"
                >
                  <div className={`w-24 h-24 ${bgColor} rounded-full flex items-center justify-center p-2.5 mb-3`}>
                    <CircularProgressbar
                      value={score}
                      maxValue={100}
                      text={`${score}`}
                      styles={buildStyles({
                        textSize: "28px",
                        textColor: color.replace("text-", "").replace("-600", "-900").replace("-700", "-900"),
                        pathColor: progressColor,
                        trailColor: "rgba(254, 254, 255, 0.66)",
                        strokeLinecap: "round",
                        pathTransitionDuration: 0.5,
                      })}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className={`font-bold text-base ${color} flex items-center gap-1`}>
                      {label}
                      <button
                        type="button"
                        aria-label={`Info about ${label}`}
                        onClick={() => handleInfoToggle(label)}
                        className="ml-1 cursor-pointer"
                      >
                        <svg
                          className="w-4 h-4 text-indigo-400 transition"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <circle cx="12" cy="8" r="1" />
                        </svg>
                      </button>
                    </div>
                    {/* Info Card */}
                    {openInfo === label && (
                      <div className="absolute z-50 top-0 left-1/2 -translate-x-1/2 bg-white border border-indigo-100 rounded-lg shadow-lg p-3 w-44 text-xs text-gray-700 animate-fade-in">
                        <div className="font-semibold mb-1">{label}</div>
                        <div>{metricInfo[label]}</div>
                        <button
                          className="block ml-auto mt-0.5 text-indigo-600 hover:underline text-xs cursor-pointer"
                          onClick={handleInfoClose}
                        >
                          Close
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {score < 30 ? "Building" : score < 60 ? "Advancing" : "Expert"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recommendations Section */}
          {reputationScore?.recommendations && reputationScore.recommendations.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-10 bg-white rounded-xl p-6 shadow-md border border-gray-100"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recommendations</h3>
              <ul className="space-y-3">
                {reputationScore.recommendations.map((recommendation, index) => (
                  <motion.li
                    key={index}
                    variants={itemVariants}
                    className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                  >
                    <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-800 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-sm text-blue-900">{recommendation}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Leaderboard section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white border rounded-xl p-5 shadow-sm mb-8"
          >
            <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold">
              <StarIcon className="w-5 h-5" />
              <h3 className="text-lg">Super Heroes Leaderboard</h3>
            </div>
            <ol className="text-sm text-gray-700 space-y-3">
              {updatedLeaderboard.map((user, index) => (
                <motion.li
                  key={`${user.name}-${user.score}`}
                  variants={itemVariants}
                  className={`flex justify-between items-center p-2 rounded ${user.isCurrentUser ? "bg-indigo-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-800">
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
              <Link href="/leaderboard" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                View full leaderboard →
              </Link>
            </div>
          </motion.div>

          {/* Tips & Next Steps */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center">
            <motion.p variants={itemVariants} className="text-sm text-gray-600 max-w-md mx-auto">
              Level up to unlock new perks, badges, and on-chain reputation power.
              <br />
              <Link href="/improve-score" className="text-indigo-600 hover:underline font-medium mt-2 inline-block">
                How to improve your score →
              </Link>
            </motion.p>
          </motion.div>
        </>
      )}
    </div>
  );
}
