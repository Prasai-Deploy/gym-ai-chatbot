import React from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Flame, Sparkles, Activity, ArrowRight } from '../icons';
import { cn } from '../tokens';

export interface DashboardHeroProps {
  userName?: string;
  readinessScore?: number; // 0 - 100
  streakDays?: number;
  onStartWorkout?: () => void;
  className?: string;
}

export const DashboardHero: React.FC<DashboardHeroProps> = React.memo(({
  userName = 'Alex',
  readinessScore = 88,
  streakDays = 7,
  onStartWorkout,
  className,
}) => {
  return (
    <div
      className={cn(
        'glass-panel w-full rounded-[30px] p-5 sm:p-7 relative overflow-hidden flex flex-col lg:flex-row lg:items-end justify-between gap-6',
        className
      )}
    >
      <div className="absolute -top-28 -right-20 w-72 h-72 bg-brand-500/12 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" size="sm" icon={<Flame className="w-3.5 h-3.5" />}>
            {streakDays} day streak
          </Badge>
          <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
            Plan updated
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-[2rem] font-extrabold text-white tracking-[-0.03em] leading-tight">
          Ready when you are, {userName}.
        </h1>
        <p className="text-sm text-slate-300 max-w-[62ch] leading-relaxed">
          Your recovery is strong. Today&apos;s upper-body session is ready, with a focused 55-minute plan and sensible rest targets.
        </p>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span><strong className="text-white">{readinessScore}% readiness</strong>, a good day to train with intent.</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2.5 shrink-0 w-full sm:w-auto">
        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={onStartWorkout}
          className="w-full sm:w-auto min-h-12"
        >
          Start workout
        </Button>
        <div className="px-4 py-3 rounded-2xl bg-slate-950/45 border border-white/10 min-w-36">
          <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">Next milestone</span>
          <span className="block mt-0.5 text-xs font-bold text-white">8 day streak</span>
        </div>
      </div>
    </div>
  );
});

DashboardHero.displayName = 'DashboardHero';
