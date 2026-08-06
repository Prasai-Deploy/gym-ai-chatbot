import React from 'react';
import { Card } from '../components/Card';
import { ReadinessScore } from './ReadinessScore';
import { RecoveryMetrics } from './RecoveryMetrics';

export interface RecoveryCardProps {
  score?: number;
  hrvMs?: number;
  sleepEfficiencyPct?: number;
  dayStrain?: number;
  className?: string;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = React.memo(({
  score = 88,
  hrvMs = 74,
  sleepEfficiencyPct = 92,
  dayStrain = 14.2,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">WHOOP & Oura Recovery Suite</span>
      <ReadinessScore score={score} />
      <RecoveryMetrics hrvMs={hrvMs} sleepEfficiencyPct={sleepEfficiencyPct} dayStrain={dayStrain} />
    </Card>
  );
});

RecoveryCard.displayName = 'RecoveryCard';
