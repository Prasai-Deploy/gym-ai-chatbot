import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Activity } from '../icons';

export interface HourlyDensity {
  hour: string;
  checkins: number;
}

export interface AttendanceHeatmapProps {
  hourlyData?: HourlyDensity[];
  className?: string;
}

export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = React.memo(({
  hourlyData = [
    { hour: '06 AM', checkins: 45 },
    { hour: '08 AM', checkins: 82 },
    { hour: '10 AM', checkins: 38 },
    { hour: '12 PM', checkins: 55 },
    { hour: '02 PM', checkins: 40 },
    { hour: '04 PM', checkins: 95 },
    { hour: '06 PM', checkins: 142 },
    { hour: '08 PM', checkins: 110 },
  ],
  className,
}) => {
  const maxCheckins = 160;

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Hourly Check-in Density</span>
        </div>
        <Badge variant="warning" size="sm">Peak: 6:00 PM</Badge>
      </div>

      <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2">
        {hourlyData.map((hd, idx) => {
          const isPeak = hd.checkins > 120;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                style={{ height: `${(hd.checkins / maxCheckins) * 100}%` }}
                className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                  isPeak
                    ? 'bg-gradient-to-t from-red-600 to-amber-500 shadow-md shadow-red-500/30'
                    : 'bg-slate-800 border-t border-white/20'
                }`}
              />
              <span className="text-[10px] text-slate-400 font-bold">{hd.hour}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
});

AttendanceHeatmap.displayName = 'AttendanceHeatmap';
