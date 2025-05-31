import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
// Import without alias
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ArrowUpIcon, ChartBarIcon, StarIcon, TrophyIcon, UserIcon } from "@heroicons/react/24/solid";

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

export default function ReputationDashboard({
  username = "Roman-24",
  level = 2,
  levelTitle = "NEWCOMER",
  levelProgress = 25,
  overallScore = 42,
  reputationMetrics = [
    { label: "HIS", score: 63, color: "text-green-600", bgColor: "bg-green-100", progressColor: "#10B981" },
    { label: "DAO", score: 18, color: "text-blue-600", bgColor: "bg-blue-100", progressColor: "#3B82F6" },
    { label: "DEFI", score: 20, color: "text-gray-700", bgColor: "bg-gray-100", progressColor: "#6B7280" },
    { label: "BAGS", score: 31, color: "text-amber-600", bgColor: "bg-amber-100", progressColor: "#F59E0B" },
  ],
  leaderboard = [
    { name: "Philip", score: 8.21 },
    { name: "Romi", score: 5.6 },
    { name: "Ellen", score: 3.5 },
    { name: "Roman-24", score: 2.25, isCurrentUser: true },
  ],
}: ReputationDashboardProps) {
  const [achievements, setAchievements] = useState<string[]>([]);

  useEffect(() => {
    // Demo - fetch achievements or determine based on score
    const earnedAchievements: string[] = [];
    if (overallScore > 30) earnedAchievements.push("Early Adopter");
    if (reputationMetrics[0].score > 50) earnedAchievements.push("History Maker");
    setAchievements(earnedAchievements);
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

  // Current date for the dashboard
  const currentDate = "2025-05-31 01:26:23"; // Using the provided date

  return (
    <div className="text-black w-full font-sans">
      {/* Welcome Banner with Date */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-xl px-6 py-4 mb-8 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <UserIcon className="w-7 h-7" />
          <h2 className="text-xl font-semibold">
            Welcome, <span className="font-bold text-indigo-700">{username}</span>!
          </h2>
        </div>
        <div className="text-sm text-purple-700 md:text-right">
          <div>
            Last updated: <time dateTime={currentDate}>{currentDate}</time>
          </div>
        </div>
      </motion.div>

      {/* Overall Score & Level Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
      >
        {/* Overall Score */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center bg-white rounded-xl p-5 shadow-sm border"
        >
          <h3 className="text-lg font-medium text-gray-700 mb-3">Overall Score</h3>
          <div className="w-32 h-32 mb-3">
            {/* Use CircularProgressbar directly as a JSX component instead of React.createElement */}
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

        {/* Level Progress - other elements remain unchanged */}
        <motion.div variants={itemVariants} className="flex flex-col bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow">
              {String(level).padStart(2, "0")}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Current Level</span>
              <div className="text-lg font-bold text-indigo-800">{levelTitle}</div>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress to level {level + 1}</span>
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
            <span>{100 - levelProgress} XP needed for next level</span>
          </div>
        </motion.div>

        {/* Achievements section remains unchanged */}
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
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mb-10">
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
          <ChartBarIcon className="w-5 h-5" />
          <h3 className="text-lg">Reputation Metrics</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {reputationMetrics.map(({ label, score, color, bgColor, progressColor }) => (
            <motion.div key={label} variants={itemVariants} className="flex flex-col items-center">
              <div className={`w-20 h-20 ${bgColor} rounded-lg flex items-center justify-center p-2`}>
                {/* Use CircularProgressbar directly as a JSX component instead of React.createElement */}
                <CircularProgressbar
                  value={score}
                  maxValue={100}
                  text={`${score}`}
                  styles={buildStyles({
                    textSize: "30px",
                    textColor: color.replace("text-", "").replace("-600", "-800").replace("-700", "-800"),
                    pathColor: progressColor,
                    trailColor: "rgba(229, 231, 235, 0.8)",
                  })}
                />
              </div>
              <div className={`mt-2 font-medium text-sm ${color}`}>{label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Leaderboard section remains unchanged */}
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
