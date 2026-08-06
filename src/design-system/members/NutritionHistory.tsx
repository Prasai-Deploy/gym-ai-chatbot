import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface NutritionLogEntry {
  id: string;
  date: string;
  calories: number;
  proteinG: number;
  adherencePct: number;
}

export interface NutritionHistoryProps {
  history?: NutritionLogEntry[];
  className?: string;
}

export const NutritionHistory: React.FC<NutritionHistoryProps> = React.memo(({
  history = [
    { id: '1', date: 'Today', calories: 2450, proteinG: 180, adherencePct: 92 },
    { id: '2', date: 'Yesterday', calories: 2380, proteinG: 175, adherencePct: 88 },
    { id: '3', date: 'Jul 30', calories: 2500, proteinG: 185, adherencePct: 95 },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Macro Compliance History</span>
        <Badge variant="success" size="sm">92% Avg Adherence</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {history.map((h) => (
          <div key={h.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{h.date}</span>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-slate-300">{h.calories} kcal</span>
              <span className="text-orange-400 font-bold">{h.proteinG}g P</span>
              <Badge variant="success" size="sm">{h.adherencePct}%</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

NutritionHistory.displayName = 'NutritionHistory';
