import React from 'react';
import { Card } from '../components/Card';
import { ProgressRing } from '../components/ProgressRing';
import { Badge } from '../components/Badge';

export interface LiveOccupancyProps {
  currentCount?: number;
  maxCapacity?: number;
  className?: string;
}

export const LiveOccupancy: React.FC<LiveOccupancyProps> = React.memo(({
  currentCount = 142,
  maxCapacity = 200,
  className,
}) => {
  const percentage = Math.min(Math.round((currentCount / maxCapacity) * 100), 100);

  return (
    <Card variant="workout" className={`p-6 flex flex-col justify-between gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Floor Capacity Load</span>
        <Badge variant={percentage > 85 ? 'danger' : 'success'} size="sm">
          {percentage}% Capacity
        </Badge>
      </div>

      <div className="flex items-center justify-around py-2">
        <ProgressRing value={percentage} size={110} strokeWidth={10} variant="primary" label={`${currentCount}`} />

        <div className="flex flex-col gap-2 text-xs font-semibold">
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">On Gym Floor:</span>
            <span className="font-extrabold text-white">{currentCount} Members</span>
          </div>
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">Max Facility Cap:</span>
            <span className="font-extrabold text-slate-300">{maxCapacity} Max</span>
          </div>
          <div className="flex items-center justify-between gap-6 p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400">Available Slots:</span>
            <span className="font-extrabold text-emerald-400">{maxCapacity - currentCount} Slots</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

LiveOccupancy.displayName = 'LiveOccupancy';
