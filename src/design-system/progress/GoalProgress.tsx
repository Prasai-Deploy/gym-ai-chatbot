import React from 'react';
import { Progress } from '../components/Progress';
import { Target, CheckCircle2 } from '../icons';
import { cn } from '../tokens';

export interface GoalProgressProps {
  goalTitle?: string;
  progressPct?: number;
  totalWeeks?: number;
  completedWeeks?: number;
  projectionText?: string;
  className?: string;
}

export const GoalProgress: React.FC<GoalProgressProps> = React.memo(({
  goalTitle = 'Hypertrophy & Strength Build',
  progressPct = 72,
  totalWeeks = 12,
  completedWeeks = 8,
  projectionText = "At your current pace, you're projected to reach your target in approximately 4 weeks.",
  className,
}) => {
  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4 shadow-sm select-none', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-[0.12em] font-sans flex items-center gap-1.5">
          <Target className="w-4 h-4" />
          YOUR GOAL
        </span>
        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          ON TRACK
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-lg sm:text-xl font-bold text-white font-display tracking-tight">
          {goalTitle}
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {completedWeeks} of {totalWeeks} weeks completed
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Phase Progress</span>
          <span className="text-white font-bold font-display tabular-nums">{progressPct}%</span>
        </div>
        <Progress value={progressPct} max={100} variant="primary" size="sm" />
      </div>

      <p className="text-xs text-slate-300 font-normal leading-relaxed pt-1 border-t border-white/[0.05]">
        {projectionText}
      </p>
    </div>
  );
});

GoalProgress.displayName = 'GoalProgress';
