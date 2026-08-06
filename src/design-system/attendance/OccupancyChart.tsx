import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface HourlyCount {
  hour: string;
  occupants: number;
}

export interface OccupancyChartProps {
  hourlyCounts?: HourlyCount[];
  className?: string;
}

export const OccupancyChart: React.FC<OccupancyChartProps> = React.memo(({
  hourlyCounts = [
    { hour: '06 AM', occupants: 45 },
    { hour: '08 AM', occupants: 82 },
    { hour: '10 AM', occupants: 38 },
    { hour: '12 PM', occupants: 55 },
    { hour: '02 PM', occupants: 40 },
    { hour: '04 PM', occupants: 95 },
    { hour: '06 PM', occupants: 142 },
    { hour: '08 PM', occupants: 110 },
  ],
  className,
}) => {
  const maxCap = 200;

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Today's Hourly Floor Occupancy Curve</span>
        <Badge variant="primary" size="sm">200 Max Capacity</Badge>
      </div>

      <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
        {hourlyCounts.map((hc, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div
              style={{ height: `${(hc.occupants / maxCap) * 100}%` }}
              className="w-full max-w-[28px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg shadow-sm shadow-emerald-500/20 transition-all duration-500"
            />
            <span className="text-[10px] text-slate-400 font-bold">{hc.hour}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

OccupancyChart.displayName = 'OccupancyChart';
