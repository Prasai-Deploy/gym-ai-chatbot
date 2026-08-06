import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface PeakHoursProps {
  peakTimeSlot?: string;
  peakOccupants?: number;
  offPeakTimeSlot?: string;
  className?: string;
}

export const PeakHours: React.FC<PeakHoursProps> = React.memo(({
  peakTimeSlot = '06:00 PM - 08:00 PM',
  peakOccupants = 142,
  offPeakTimeSlot = '01:00 PM - 03:00 PM',
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Gym Floor Density Breakdown</span>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Peak Floor Hours</span>
          <span className="text-base font-extrabold text-amber-400">{peakTimeSlot}</span>
          <span className="text-[10px] text-slate-400 font-semibold">{peakOccupants} Peak Members</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Recommended Off-Peak</span>
          <span className="text-base font-extrabold text-emerald-400">{offPeakTimeSlot}</span>
          <span className="text-[10px] text-slate-400 font-semibold">Low Density Floor</span>
        </div>
      </div>
    </Card>
  );
});

PeakHours.displayName = 'PeakHours';
