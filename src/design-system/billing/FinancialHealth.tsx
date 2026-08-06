import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface FinancialHealthProps {
  score?: number;
  rating?: string;
  className?: string;
}

export const FinancialHealth: React.FC<FinancialHealthProps> = React.memo(({
  score = 94,
  rating = 'Top 5% SaaS Financial Health',
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Facility Financial Health Index</span>
        <Badge variant="success" size="sm">{score} / 100 Excellent</Badge>
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-400 font-semibold">{rating}</span>
        <span className="text-emerald-400 font-bold font-mono">98.2% Paid-on-Time Rate</span>
      </div>
    </Card>
  );
});

FinancialHealth.displayName = 'FinancialHealth';
