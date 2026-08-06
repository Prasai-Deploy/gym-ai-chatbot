import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { User, Award, Zap } from '../icons';

export interface TrainerCardProps {
  activeTrainersOnFloor?: number;
  totalTrainersCount?: number;
  ptUtilizationPct?: number;
  className?: string;
}

export const TrainerCard: React.FC<TrainerCardProps> = React.memo(({
  activeTrainersOnFloor = 6,
  totalTrainersCount = 8,
  ptUtilizationPct = 84,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col justify-between gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trainer Staffing & PT Load</span>
        </div>
        <Badge variant="primary" size="sm">{ptUtilizationPct}% PT Booked</Badge>
      </div>

      <div className="flex items-baseline justify-between py-1">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400">Trainers Active On Floor</span>
          <span className="text-3xl font-black text-white">{activeTrainersOnFloor} / {totalTrainersCount} Staff</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs text-slate-400">PT Booking Rate</span>
          <span className="text-xl font-bold text-indigo-400">{ptUtilizationPct}%</span>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Personal Training Sessions Today:</span>
        <span className="font-extrabold text-white flex items-center gap-1">
          <Zap className="w-4 h-4 text-amber-400" />
          28 Sessions Logged
        </span>
      </div>
    </Card>
  );
});

TrainerCard.displayName = 'TrainerCard';
