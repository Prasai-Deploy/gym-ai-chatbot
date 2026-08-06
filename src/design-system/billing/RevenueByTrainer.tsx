import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface TrainerRevenue {
  trainerName: string;
  revenueThisMonth: number;
}

export interface RevenueByTrainerProps {
  trainers?: TrainerRevenue[];
  className?: string;
}

export const RevenueByTrainer: React.FC<RevenueByTrainerProps> = React.memo(({
  trainers = [
    { trainerName: 'Coach Elena Rostova', revenueThisMonth: 4250 },
    { trainerName: 'Coach Brandon Vance', revenueThisMonth: 3800 },
    { trainerName: 'Coach Maya Lin', revenueThisMonth: 3100 },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">PT Revenue Contribution By Coach</span>
        <Badge variant="primary" size="sm">$11,150 Total PT</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {trainers.map((t, idx) => (
          <div key={idx} className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{t.trainerName}</span>
            <span className="font-mono font-extrabold text-amber-400">${t.revenueThisMonth.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

RevenueByTrainer.displayName = 'RevenueByTrainer';
