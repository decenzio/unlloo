import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { normalize } from "viem/ens";
import { useAccount, useEnsAvatar, useEnsName } from "wagmi";
import { ArrowUpIcon, ChartBarIcon, StarIcon, TrophyIcon, UserIcon } from "@heroicons/react/24/solid";
import { BlockieAvatar } from "~~/components/scaffold-eth";
// import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";
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
  username?: string;
  level?: number;
  levelTitle?: string;
  levelProgress?: number;
  reputationMetrics?: ReputationMetric[];
  leaderboard?: LeaderboardUser[];
  overallScore?: number;
}

// Default values outside component to prevent recreation on each render
const DEFAULT_REPUTATION_METRICS: ReputationMetric[] = [
  {
    label: "HISTORY",
    score: 63,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    progressColor: "#3B82F6", // blue-500
  },
  {
    label: "DEFI",
    score: 20,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    progressColor: "#8B5CF6", // purple-500
  },
  {
    label: "DAO",
    score: 18,
    color: "text-green-700",
    bgColor: "bg-green-100",
    progressColor: "#22C55E", // green-500
  },
  {
    label: "BAGS",
    score: 31,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    progressColor: "#F59E42", // amber-500
  },
];

const DEFAULT_LEADERBOARD: LeaderboardUser[] = [
  { name: "Philip", score: 8.21 },
  { name: "Romi", score: 5.6, isCurrentUser: true },
  { name: "Ellen", score: 3.5 },
];

export default function ReputationDashboard({
  username = "Romi",
  level = 2,
  levelTitle = "NEWCOMER",
  levelProgress = 25,
  overallScore = 42,
  reputationMetrics = DEFAULT_REPUTATION_METRICS,
  leaderboard = DEFAULT_LEADERBOARD,
}: ReputationDashboardProps) {
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

  // Generate block explorer link based on address and current network
  const blockExplorerAddressLink = address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;

  // Display name fallback logic
  const displayName = ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : username);

  // Calculate achievements directly without causing re-renders
  const achievements = useMemo(() => {
    const earnedAchievements: string[] = [];
    if (overallScore > 30) earnedAchievements.push("Early Adopter");
    if (reputationMetrics[0].score > 50) earnedAchievements.push("History Maker");
    return earnedAchievements;
  }, [overallScore, reputationMetrics]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  // Info card state for metrics
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  // Info texts for each metric
  const metricInfo: Record<string, string> = {
    HISTORY: "Reflects your on-chain activity and longevity. The higher, the more established your address.",
    DEFI: "Shows your engagement with DeFi protocols. Interact with DeFi to grow this score.",
    DAO: "Measures your participation in DAOs and governance. Get involved to increase it.",
    BAGS: "Represents your wallet diversity and asset holdings. More variety and value means a higher score.",
  };

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
              {/* <div className="text-sm text-purple-600 font-small mb-1">Welcome back</div> */}
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
                <span>{levelProgress}%</span>
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
        {/* </motion.div> */}
      </motion.div>

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
            {React.createElement(CircularProgressbar, {
              value: overallScore,
              maxValue: 100,
              text: `${overallScore}`,
              styles: buildStyles({
                textSize: "28px",
                pathColor: `rgba(101, 116, 205, ${overallScore / 100})`,
                textColor: "#4338CA",
                trailColor: "#E5E7EB",
                pathTransitionDuration: 1,
              }),
            })}
          </div>
          <div className="text-sm text-center text-gray-600">
            {overallScore < 30
              ? "Building reputation..."
              : overallScore < 60
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
          <div className="text-sm text-gray-600">Your current maximum borrow limit based on your reputation score.</div>
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

          {achievements.length > 0 ? (
            <ul className="space-y-3">
              {achievements.map(achievement => (
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
          {reputationMetrics.map(({ label, score, color, bgColor, progressColor }) => (
            <motion.div
              key={label}
              variants={itemVariants}
              //   whileHover={{
              //     scale: 1.05,
              //     transition: { duration: 0.2 },
              //   }}
              className="relative flex flex-col items-center bg-white rounded-xl p-4 shadow-sm transition-shadow duration-200"
            >
              <div className={`w-24 h-24 ${bgColor} rounded-full flex items-center justify-center p-2.5 mb-3`}>
                {React.createElement(CircularProgressbar, {
                  value: score,
                  maxValue: 100,
                  text: `${score}`,
                  styles: buildStyles({
                    textSize: "28px",
                    textColor: color.replace("text-", "").replace("-600", "-900").replace("-700", "-900"),
                    pathColor: progressColor,
                    trailColor: "rgba(254, 254, 255, 0.66)",
                    strokeLinecap: "round",
                    pathTransitionDuration: 0.5,
                  }),
                })}
              </div>
              <div className="flex flex-col items-center">
                <div className={`font-bold text-base ${color} flex items-center gap-1`}>
                  {label}
                  <button
                    type="button"
                    aria-label={`Info about ${label}`}
                    onClick={() => setOpenInfo(openInfo === label ? null : label)}
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
                      onClick={() => setOpenInfo(null)}
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
          {leaderboard.map((user, index) => (
            <motion.li
              key={user.name}
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
    </div>
  );
}
