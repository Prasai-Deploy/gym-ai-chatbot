import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Flame, Dumbbell, Clock } from '../icons';
import { cn } from '../tokens';

export interface ProgressHeroProps {
  workoutCount?: number;
  totalVolumeKg?: number;
  currentStreakDays?: number;
  trainingTimeHours?: number;
  headline?: string;
  hasHistory?: boolean;
  onStartWorkout?: () => void;
  className?: string;
}

export const ProgressHero: React.FC<ProgressHeroProps> = React.memo(({
  workoutCount = 0,
  totalVolumeKg = 0,
  currentStreakDays = 0,
  trainingTimeHours = 0,
  headline,
  hasHistory = false,
  onStartWorkout,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-6 sm:p-8 flex flex-col items-center text-center gap-6 select-none shadow-sm',
        className
      )}
    >
      {/* Top Tag */}
      <span className="text-xs font-bold text-lime-400 uppercase tracking-wider font-sans flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4" />
        YOUR PROGRESS
      </span>

      {/* Central Large Metric */}
      <div className="flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-5xl sm:text-6xl font-extrabold text-white font-display tracking-tight leading-none"
        >
          {workoutCount}
        </motion.span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5 font-sans">
          Total Workouts Completed
        </span>
      </div>

      {/* Main Headline */}
      <p className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug max-w-sm">
        {headline || (hasHistory ? "Consistent effort builds strength and health." : "No workout history recorded yet.")}
      </p>

      {/* Supporting 3 Metrics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-lg pt-5 border-t border-white/[0.06]">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-slate-400" />
            Volume
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {hasHistory ? `${totalVolumeKg.toLocaleString()} kg` : '--'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 border-x border-white/[0.06]">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Streak
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {hasHistory ? `${currentStreakDays}d` : '--'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Time
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {hasHistory ? `${trainingTimeHours}h` : '--'}
          </span>
        </div>
      </div>

      {!hasHistory && onStartWorkout && (
        <button
          type="button"
          onClick={onStartWorkout}
          className="mt-2 min-h-[48px] px-6 py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-sm font-bold flex items-center gap-2 shadow-md shadow-lime-500/20 transition-all cursor-pointer"
        >
          <Flame className="w-4 h-4 fill-current" />
          <span>Start First Workout</span>
        </button>
      )}
    </div>
  );
});

ProgressHero.displayName = 'ProgressHero';
