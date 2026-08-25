import React from 'react';
import { Card } from '../components/Card';
import { ProgressRing } from '../components/ProgressRing';
import { Badge } from '../components/Badge';

export interface HealthScoreCardProps {
  score?: number;
  strengthIndex?: number;
  recoveryIndex?: number;
  cardioIndex?: number;
  className?: string;
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = React.memo(({
  score = 92,
  strengthIndex = 94,
  recoveryIndex = 88,
  cardioIndex = 90,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">STRIVA Integrated Health Index</span>
        <Badge variant="primary" size="sm">Top 5% Gym Member</Badge>
      </div>

      <div className="flex items-center justify-around py-2">
        <ProgressRing value={score} size={110} strokeWidth={10} variant="primary" label="Health Score" />

        <div className="flex flex-col gap-2 text-xs font-semibold">
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">Strength Index:</span>
            <span className="font-extrabold text-brand-400">{strengthIndex} / 100</span>
          </div>
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">Recovery Index:</span>
            <span className="font-extrabold text-emerald-400">{recoveryIndex} / 100</span>
          </div>
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">Cardio Index:</span>
            <span className="font-extrabold text-indigo-400">{cardioIndex} / 100</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

HealthScoreCard.displayName = 'HealthScoreCard';
