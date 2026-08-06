import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { TrendingUp, Dumbbell } from '../icons';

export interface StrengthDataPoint {
  month: string;
  benchKg: number;
  squatKg: number;
  deadliftKg: number;
}

export interface StrengthChartProps {
  dataPoints?: StrengthDataPoint[];
  className?: string;
}

export const StrengthChart: React.FC<StrengthChartProps> = React.memo(({
  dataPoints = [
    { month: 'Jan', benchKg: 80, squatKg: 100, deadliftKg: 130 },
    { month: 'Feb', benchKg: 85, squatKg: 105, deadliftKg: 135 },
    { month: 'Mar', benchKg: 90, squatKg: 110, deadliftKg: 140 },
    { month: 'Apr', benchKg: 92.5, squatKg: 115, deadliftKg: 145 },
    { month: 'May', benchKg: 97.5, squatKg: 120, deadliftKg: 155 },
    { month: 'Jun', benchKg: 102.5, squatKg: 125, deadliftKg: 165 },
  ],
  className,
}) => {
  const maxVal = 180;

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-orange-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Compound Strength Progression (1RM)</span>
        </div>
        <Badge variant="primary" size="sm" icon={<TrendingUp className="w-3.5 h-3.5" />}>
          +14.5% Overall
        </Badge>
      </div>

      <div className="flex items-center justify-around gap-2 pt-4 pb-2 border-b border-white/5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Bench Press</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span>Squat</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Deadlift</span>
        </div>
      </div>

      <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
        {dataPoints.map((dp, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full flex items-end justify-center gap-1 h-full">
              {/* Bench */}
              <div
                style={{ height: `${(dp.benchKg / maxVal) * 100}%` }}
                className="w-2.5 bg-orange-500 rounded-t-lg shadow-sm shadow-orange-500/30 transition-all duration-500"
              />
              {/* Squat */}
              <div
                style={{ height: `${(dp.squatKg / maxVal) * 100}%` }}
                className="w-2.5 bg-indigo-500 rounded-t-lg shadow-sm shadow-indigo-500/30 transition-all duration-500"
              />
              {/* Deadlift */}
              <div
                style={{ height: `${(dp.deadliftKg / maxVal) * 100}%` }}
                className="w-2.5 bg-emerald-500 rounded-t-lg shadow-sm shadow-emerald-500/30 transition-all duration-500"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{dp.month}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

StrengthChart.displayName = 'StrengthChart';
