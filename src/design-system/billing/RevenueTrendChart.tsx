import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface MonthlyRevenueData {
  month: string;
  mrrAmount: number;
}

export interface RevenueTrendChartProps {
  monthlyData?: MonthlyRevenueData[];
  className?: string;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = React.memo(({
  monthlyData = [
    { month: 'Jan', mrrAmount: 38000 },
    { month: 'Feb', mrrAmount: 40200 },
    { month: 'Mar', mrrAmount: 41800 },
    { month: 'Apr', mrrAmount: 43500 },
    { month: 'May', mrrAmount: 44200 },
    { month: 'Jun', mrrAmount: 46100 },
    { month: 'Jul', mrrAmount: 48250 },
  ],
  className,
}) => {
  const maxMrr = 60000;

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">12-Month MRR Recurring Revenue Growth</span>
        <Badge variant="primary" size="sm">+26.9% YTD Expansion</Badge>
      </div>

      <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
        {monthlyData.map((d, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div
              style={{ height: `${(d.mrrAmount / maxMrr) * 100}%` }}
              className="w-full max-w-[28px] bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg shadow-sm shadow-amber-500/20 transition-all duration-500"
            />
            <span className="text-[10px] text-slate-400 font-bold">{d.month}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

RevenueTrendChart.displayName = 'RevenueTrendChart';
