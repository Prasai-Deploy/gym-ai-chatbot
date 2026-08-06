import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProgressRing } from '../components/ProgressRing';
import { Heart, Activity, Zap } from '../icons';

export interface RecoveryCardProps {
  score?: number;
  hrvMs?: number;
  sleepHours?: number;
  strainScore?: number;
  className?: string;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = React.memo(({
  score = 88,
  hrvMs = 74,
  sleepHours = 7.8,
  strainScore = 14.2,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col justify-between gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">WHOOP / Oura Readiness</span>
        <Badge variant="success" size="sm">Optimal</Badge>
      </div>

      <div className="flex items-center justify-around py-2">
        <ProgressRing value={score} size={100} strokeWidth={9} variant="success" label="Recovery" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">HRV:</span>
            <span className="text-xs font-bold text-white">{hrvMs} ms</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Sleep:</span>
            <span className="text-xs font-bold text-white">{sleepHours} hrs</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Strain:</span>
            <span className="text-xs font-bold text-white">{strainScore} / 21</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

RecoveryCard.displayName = 'RecoveryCard';
