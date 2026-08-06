import React from 'react';
import { Badge } from '../components/Badge';
import { Activity } from '../icons';

export interface ReadinessScoreProps {
  score?: number;
  status?: string;
  className?: string;
}

export const ReadinessScore: React.FC<ReadinessScoreProps> = React.memo(({
  score = 88,
  status = 'Peak Anabolic Primed',
  className,
}) => {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 select-none ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-500/30">
          {score}%
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-extrabold text-white">{status}</span>
          <span className="text-[10px] text-slate-400">High strain capacity for training today</span>
        </div>
      </div>
      <Badge variant="success" size="sm" icon={<Activity className="w-3.5 h-3.5" />}>
        Optimal
      </Badge>
    </div>
  );
});

ReadinessScore.displayName = 'ReadinessScore';
