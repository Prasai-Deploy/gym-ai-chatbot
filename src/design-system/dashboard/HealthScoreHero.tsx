import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../tokens';

export interface HealthScoreHeroProps {
  score?: number; // 0 - 100
  recoveryScore?: number;
  sleepScore?: number;
  activityScore?: number;
  headline?: string;
  className?: string;
}

export const HealthScoreHero: React.FC<HealthScoreHeroProps> = React.memo(({
  score = 88,
  recoveryScore = 88,
  sleepScore = 92,
  activityScore = 84,
  headline,
  className,
}) => {
  // Compute default headline if not provided
  const dynamicHeadline = headline || (
    score >= 80
      ? "You're ready for a strong training day."
      : score >= 60
      ? 'Moderate readiness. Maintain steady pacing today.'
      : 'Recovery prioritized today. Focus on rest and hydration.'
  );

  // Circular gauge parameters
  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-6 sm:p-8 flex flex-col items-center text-center gap-6 select-none shadow-sm relative overflow-hidden',
        className
      )}
    >
      {/* Central Circular Health Score Arc */}
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Score Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F97316"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Display Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-5xl sm:text-6xl font-extrabold text-white font-display tracking-tight leading-none"
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mt-1.5 font-sans">
            Health Score
          </span>
        </div>
      </div>

      {/* Main Recommendation Headline */}
      <div className="flex flex-col items-center gap-1 max-w-md">
        <p className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug">
          {dynamicHeadline}
        </p>
      </div>

      {/* Supporting Metrics: Recovery, Sleep, Activity */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-lg pt-5 border-t border-white/[0.06]">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Recovery</span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {recoveryScore}%
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 border-x border-white/[0.06]">
          <span className="text-xs text-slate-400 font-medium">Sleep</span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {sleepScore}%
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Activity</span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {activityScore}%
          </span>
        </div>
      </div>
    </div>
  );
});

HealthScoreHero.displayName = 'HealthScoreHero';
