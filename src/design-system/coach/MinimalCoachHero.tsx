import React from 'react';
import { Bot, Sparkles } from '../icons';
import { cn } from '../tokens';

export interface MinimalCoachHeroProps {
  userName?: string;
  insightQuote?: string;
  recoveryScore?: number;
  sleepScore?: number;
  trainingStatus?: string;
  className?: string;
}

export const MinimalCoachHero: React.FC<MinimalCoachHeroProps> = React.memo(({
  userName = 'Athlete',
  insightQuote = "You're recovered and ready to train.",
  recoveryScore = 88,
  sleepScore = 92,
  trainingStatus = 'On track',
  className,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-6 sm:p-8 flex flex-col items-center text-center gap-5 select-none shadow-sm',
        className
      )}
    >
      {/* Small Trinity Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/[0.08] border border-indigo-500/20 text-indigo-400">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] font-sans">
          TRINITY
        </span>
      </div>

      {/* Greeting & Main Insight Quote */}
      <div className="flex flex-col items-center gap-1.5 max-w-md">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-base sm:text-lg text-slate-200 font-semibold tracking-tight leading-snug">
          "{insightQuote}"
        </p>
      </div>

      {/* Supporting Context Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-md pt-4 border-t border-white/[0.06]">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Recovery</span>
          <span className="text-base sm:text-lg font-bold text-white font-display tabular-nums">
            {recoveryScore}%
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 border-x border-white/[0.06]">
          <span className="text-xs text-slate-400 font-medium">Sleep</span>
          <span className="text-base sm:text-lg font-bold text-white font-display tabular-nums">
            {sleepScore}%
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-slate-400 font-medium">Training</span>
          <span className="text-base sm:text-lg font-bold text-emerald-400 font-display">
            {trainingStatus}
          </span>
        </div>
      </div>
    </div>
  );
});

MinimalCoachHero.displayName = 'MinimalCoachHero';
