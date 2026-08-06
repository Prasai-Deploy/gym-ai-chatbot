import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProgressRing } from '../components/ProgressRing';
import { Users, Activity } from '../icons';

export interface AttendanceCardProps {
  currentOccupancy?: number;
  maxCapacity?: number;
  totalCheckinsToday?: number;
  className?: string;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = React.memo(({
  currentOccupancy = 142,
  maxCapacity = 200,
  totalCheckinsToday = 680,
  className,
}) => {
  const capacityPct = Math.round((currentOccupancy / maxCapacity) * 100);

  return (
    <Card variant="workout" className={`p-6 flex flex-col justify-between gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Gym Floor Live Occupancy</span>
        </div>
        <Badge variant="warning" size="sm">{capacityPct}% Floor Load</Badge>
      </div>

      <div className="flex items-center justify-between py-1">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Members Currently On Floor</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-white">{currentOccupancy}</span>
            <span className="text-xs text-slate-400">/ {maxCapacity} max capacity</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold mt-1">
            {totalCheckinsToday} Total Check-ins Today
          </span>
        </div>

        <ProgressRing value={capacityPct} size={100} strokeWidth={9} variant="warning" label={`${currentOccupancy}`} />
      </div>
    </Card>
  );
});

AttendanceCard.displayName = 'AttendanceCard';
