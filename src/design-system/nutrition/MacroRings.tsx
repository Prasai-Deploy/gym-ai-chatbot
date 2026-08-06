import React from 'react';
import { Card } from '../components/Card';
import { MacroCard } from './MacroCard';
import { Badge } from '../components/Badge';

export interface MacroRingsProps {
  protein?: { current: number; target: number };
  carbs?: { current: number; target: number };
  fats?: { current: number; target: number };
  className?: string;
}

export const MacroRings: React.FC<MacroRingsProps> = React.memo(({
  protein = { current: 155, target: 180 },
  carbs = { current: 220, target: 250 },
  fats = { current: 55, target: 65 },
  className,
}) => {
  return (
    <Card variant="nutrition" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Macronutrient Target Ratios</span>
        <Badge variant="success" size="sm">85% Met</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MacroCard label="Protein" currentGrams={protein.current} targetGrams={protein.target} variant="primary" />
        <MacroCard label="Carbohydrates" currentGrams={carbs.current} targetGrams={carbs.target} variant="ai" />
        <MacroCard label="Fats" currentGrams={fats.current} targetGrams={fats.target} variant="success" />
      </div>
    </Card>
  );
});

MacroRings.displayName = 'MacroRings';
