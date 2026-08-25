import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Calendar } from '../icons';

export interface ConsistencyHeatmapProps {
  totalActiveDays?: number;
  weeksCount?: number;
  className?: string;
}

export const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = React.memo(({
  totalActiveDays = 142,
  weeksCount = 20,
  className,
}) => {
  // Generate mock 5-row x 20-col density grid
  const densityLevels = [0, 1, 2, 3, 4];
  const grid = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: weeksCount }, (_, c) => {
      const isHigh = (r + c) % 3 === 0;
      const isMed = (r + c) % 2 === 0;
      return isHigh ? 3 : isMed ? 2 : (r * c) % 5 === 0 ? 0 : 1;
    })
  );

  const getCellColor = (val: number) => {
    switch (val) {
      case 3:
        return 'bg-brand-500 shadow-sm shadow-brand-500/30';
      case 2:
        return 'bg-brand-600/70';
      case 1:
        return 'bg-brand-950/60 border border-brand-500/20';
      default:
        return 'bg-slate-900 border border-white/5';
    }
  };

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Consistency Heatmap (52 Weeks)</span>
        </div>
        <Badge variant="primary" size="sm">{totalActiveDays} Active Days</Badge>
      </div>

      <div className="flex flex-col gap-1.5 overflow-x-auto no-scrollbar py-2">
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="flex items-center gap-1.5 min-w-max">
            {row.map((cell, cIdx) => (
              <div
                key={cIdx}
                title={`Week ${cIdx + 1}, Day ${rIdx + 1}: ${cell > 0 ? 'Workout Logged' : 'Rest'}`}
                className={`w-3.5 h-3.5 rounded-md transition-transform hover:scale-125 ${getCellColor(cell)}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 font-semibold pt-1">
        <span>Less Active</span>
        <div className="w-3 h-3 rounded-md bg-slate-900 border border-white/5" />
        <div className="w-3 h-3 rounded-md bg-brand-950/60" />
        <div className="w-3 h-3 rounded-md bg-brand-600/70" />
        <div className="w-3 h-3 rounded-md bg-brand-500" />
        <span>Peak Intensity</span>
      </div>
    </Card>
  );
});

ConsistencyHeatmap.displayName = 'ConsistencyHeatmap';
