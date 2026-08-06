import React from 'react';
import { Card } from '../components/Card';
import { ProgressRing } from '../components/ProgressRing';
import { Badge } from '../components/Badge';

export interface BusinessHealthProps {
  score?: number;
  mrrGrowthIndex?: number;
  retentionRatePct?: number;
  staffRatingScore?: number;
  className?: string;
}

export const BusinessHealth: React.FC<BusinessHealthProps> = React.memo(({
  score = 94,
  mrrGrowthIndex = 92,
  retentionRatePct = 96,
  staffRatingScore = 95,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">STRIVA Business Health Index</span>
        <Badge variant="success" size="sm">A+ Grade Operating Status</Badge>
      </div>

      <div className="flex items-center justify-around py-2">
        <ProgressRing value={score} size={110} strokeWidth={10} variant="warning" label="Health Score" />

        <div className="flex flex-col gap-2 text-xs font-semibold">
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">MRR Trajectory:</span>
            <span className="font-extrabold text-amber-400">{mrrGrowthIndex} / 100</span>
          </div>
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">Retention Rate:</span>
            <span className="font-extrabold text-emerald-400">{retentionRatePct}%</span>
          </div>
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">Staff Satisfaction:</span>
            <span className="font-extrabold text-indigo-400">{staffRatingScore} / 100</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

BusinessHealth.displayName = 'BusinessHealth';
