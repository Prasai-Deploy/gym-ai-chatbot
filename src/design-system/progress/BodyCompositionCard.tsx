import React from 'react';
import { Card } from '../components/Card';
import { Progress } from '../components/Progress';
import { Badge } from '../components/Badge';

export interface BodyCompositionCardProps {
  leanMassKg?: number;
  fatMassKg?: number;
  totalKg?: number;
  className?: string;
}

export const BodyCompositionCard: React.FC<BodyCompositionCardProps> = React.memo(({
  leanMassKg = 66.8,
  fatMassKg = 11.7,
  totalKg = 78.5,
  className,
}) => {
  const leanPct = Math.round((leanMassKg / totalKg) * 100);

  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Body Composition Breakdown</span>
        <Badge variant="success" size="sm">Anabolic Lean Focus</Badge>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400">Lean Tissue Mass</span>
          <span className="text-2xl font-black text-white">{leanMassKg} kg ({leanPct}%)</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs text-slate-400">Essential Fat Mass</span>
          <span className="text-2xl font-black text-amber-400">{fatMassKg} kg ({100 - leanPct}%)</span>
        </div>
      </div>

      <Progress value={leanMassKg} max={totalKg} variant="primary" size="md" />
    </Card>
  );
});

BodyCompositionCard.displayName = 'BodyCompositionCard';
