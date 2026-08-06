import React from 'react';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { Badge } from '../components/Badge';

export interface MacroOverviewProps {
  proteinGrams?: { current: number; target: number };
  carbsGrams?: { current: number; target: number };
  fatsGrams?: { current: number; target: number };
  className?: string;
}

export const MacroOverview: React.FC<MacroOverviewProps> = React.memo(({
  proteinGrams = { current: 145, target: 180 },
  carbsGrams = { current: 210, target: 250 },
  fatsGrams = { current: 52, target: 65 },
  className,
}) => {
  return (
    <Card variant="nutrition" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Macronutrient Target</span>
        <Badge variant="success" size="sm">82% Achieved</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Protein"
          currentValue={proteinGrams.current}
          targetValue={proteinGrams.target}
          unit="g"
          variant="primary"
        />
        <MetricCard
          label="Carbohydrates"
          currentValue={carbsGrams.current}
          targetValue={carbsGrams.target}
          unit="g"
          variant="ai"
        />
        <MetricCard
          label="Fats"
          currentValue={fatsGrams.current}
          targetValue={fatsGrams.target}
          unit="g"
          variant="success"
        />
      </div>
    </Card>
  );
});

MacroOverview.displayName = 'MacroOverview';
