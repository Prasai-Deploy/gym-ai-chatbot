import React from 'react';
import { Card } from '../components/Card';
import { TrendingUp, Activity, Award } from '../icons';
import { cn } from '../tokens';

export interface ConsistencySummaryProps {
  progressData?: any;
  onOpenProgress: () => void;
  className?: string;
}

export const ConsistencySummary: React.FC<ConsistencySummaryProps> = React.memo(({
  progressData,
  onOpenProgress,
  className,
}) => {
  const workoutCount = progressData?.workout_count || 0;
  const streak = progressData?.current_streak || 0;
  const longestStreak = progressData?.longest_streak || 0;

  return (
    <div className={cn('w-full flex flex-col gap-3', className)}>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans px-1">
        RECENT PROGRESS
      </span>

      <Card
        variant="default"
        onClick={onOpenProgress}
        className="w-full p-5 rounded-2xl bg-[#11141D] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-base font-bold text-white tracking-tight font-sans">
              {workoutCount > 0
                ? `${workoutCount} Workout${workoutCount > 1 ? 's' : ''} Completed`
                : 'No Workouts Completed Yet'}
            </h4>
            <p className="text-xs text-slate-300 font-sans">
              {streak > 0
                ? `${streak}-day active streak. Best streak: ${longestStreak} days.`
                : `Complete your first workout to start tracking your streak.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {streak > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-lime-500/10 border border-lime-500/25 text-lime-400 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-lime-500/5">
              <Award className="w-3.5 h-3.5" />
              <span>{streak}d Streak</span>
            </div>
          )}

          <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
            View Progress →
          </span>
        </div>
      </Card>
    </div>
  );
});

ConsistencySummary.displayName = 'ConsistencySummary';
