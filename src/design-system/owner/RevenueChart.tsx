import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { CreditCard, TrendingUp } from '../icons';

export interface RevenueDataPoint {
  month: string;
  mrrDollars: number;
}

export interface RevenueChartProps {
  dataPoints?: RevenueDataPoint[];
  className?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = React.memo(({
  dataPoints = [
    { month: 'Feb', mrrDollars: 38500 },
    { month: 'Mar', mrrDollars: 41200 },
    { month: 'Apr', mrrDollars: 43000 },
    { month: 'May', mrrDollars: 44800 },
    { month: 'Jun', mrrDollars: 46200 },
    { month: 'Jul', mrrDollars: 48250 },
  ],
  className,
}) => {
  const maxVal = 60000;

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">MRR Revenue Growth Trajectory (6 Mo)</span>
        </div>
        <Badge variant="warning" size="sm" icon={<TrendingUp className="w-3.5 h-3.5" />}>
          +$9,750 MoM Net Growth
        </Badge>
      </div>

      <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
        {dataPoints.map((dp, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div
              style={{ height: `${(dp.mrrDollars / maxVal) * 100}%` }}
              className="w-full max-w-[36px] bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-xl shadow-md shadow-amber-500/20 transition-all duration-500"
            />
            <span className="text-[10px] text-slate-400 font-bold uppercase">{dp.month}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

RevenueChart.displayName = 'RevenueChart';
