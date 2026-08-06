import React from 'react';
import { Badge } from '../components/Badge';
import { Flame, Sparkles, Activity } from '../icons';
import { cn } from '../tokens';

export interface DashboardHeroProps {
  userName?: string;
  readinessScore?: number; // 0 - 100
  streakDays?: number;
  className?: string;
}

export const DashboardHero: React.FC<DashboardHeroProps> = React.memo(({
  userName = 'Alex',
  readinessScore = 88,
  streakDays = 7,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 select-none',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="sm" icon={<Flame className="w-3.5 h-3.5" />}>
            {streakDays}-DAY STREAK
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            AI RECOVERY PRIMED
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-indigo-400">{userName}</span> 👋
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          Your body is <span className="text-white font-bold">{readinessScore}% primed</span> for optimal performance today. Trinity AI has prepared your hyper-trophy mission.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0">
        <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <Activity className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Readiness Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{readinessScore}</span>
            <span className="text-xs text-emerald-400 font-bold">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-400">Peak CNS Recovery</span>
        </div>
      </div>
    </div>
  );
});

DashboardHero.displayName = 'DashboardHero';
