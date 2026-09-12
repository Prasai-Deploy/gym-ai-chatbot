import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp } from '../icons';
import { cn } from '../tokens';

export interface ProgressHeroProps {
  overallProgressPct?: number;
  strengthGainPct?: number;
  consistencyGainPct?: number;
  bodyChangePct?: number;
  headline?: string;
  className?: string;
}

export const ProgressHero: React.FC<ProgressHeroProps> = React.memo(({
  overallProgressPct = 12,
  strengthGainPct = 14,
  consistencyGainPct = 9,
  bodyChangePct = -2,
  headline = "You're moving in the right direction.",
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
      <span className="text-[11px] font-bold text-orange-400 uppercase tracking-[0.14em] font-sans flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" />
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
          +{overallProgressPct}%
        </motion.span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mt-1.5 font-sans">
          Overall Progress
        </span>
      </div>

      {/* Main Headline */}
      <p className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug max-w-sm">
        {headline}
      </p>

      {/* 3 Supporting Metrics: Strength, Consistency, Body */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-lg pt-5 border-t border-white/[0.06]">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Strength</span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            +{strengthGainPct}%
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 border-x border-white/[0.06]">
          <span className="text-xs text-slate-400 font-medium">Consistency</span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            +{consistencyGainPct}%
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Body Comp</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-display tabular-nums">
            {bodyChangePct}%
          </span>
        </div>
      </div>
    </div>
  );
});

ProgressHero.displayName = 'ProgressHero';
