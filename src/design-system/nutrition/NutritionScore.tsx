import React from 'react';
import { ProgressRing } from '../components/ProgressRing';
import { Badge } from '../components/Badge';

export interface NutritionScoreProps {
  score?: number;
  caloriesCurrent?: number;
  caloriesTarget?: number;
  className?: string;
}

export const NutritionScore: React.FC<NutritionScoreProps> = React.memo(({
  score = 88,
  caloriesCurrent = 2150,
  caloriesTarget = 2650,
  className,
}) => {
  return (
    <div className={`p-5 rounded-3xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-4 select-none ${className}`}>
      <div className="flex flex-col gap-1">
        <Badge variant="success" size="sm">Adherence Rating</Badge>
        <span className="text-xs font-semibold text-slate-400">Total Calories</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{caloriesCurrent.toLocaleString()}</span>
          <span className="text-xs text-slate-400">/ {caloriesTarget.toLocaleString()} kcal</span>
        </div>
      </div>

      <ProgressRing value={score} size={90} strokeWidth={9} variant="success" label="Adherence" />
    </div>
  );
});

NutritionScore.displayName = 'NutritionScore';
