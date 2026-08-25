import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Flame, Award } from '../icons';

export interface StreakCardProps {
  currentStreakDays?: number;
  bestStreakDays?: number;
  totalWorkouts?: number;
  className?: string;
}

export const StreakCard: React.FC<StreakCardProps> = React.memo(({
  currentStreakDays = 7,
  bestStreakDays = 21,
  totalWorkouts = 142,
  className,
}) => {
  return (
    <Card variant="workout" className={`p-6 flex flex-col justify-between gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-brand-500" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Active Streak</span>
        </div>
        <Badge variant="primary" size="sm">{currentStreakDays} Days Streak</Badge>
      </div>

      <div className="flex items-baseline justify-between py-1">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400">Current Streak</span>
          <span className="text-3xl font-black text-white">{currentStreakDays} Days 🔥</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs text-slate-400">All-Time Best</span>
          <span className="text-xl font-bold text-brand-400">{bestStreakDays} Days</span>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Total Workouts Completed:</span>
        <span className="font-extrabold text-white flex items-center gap-1">
          <Award className="w-4 h-4 text-amber-400" />
          {totalWorkouts} Sessions
        </span>
      </div>
    </Card>
  );
});

StreakCard.displayName = 'StreakCard';
