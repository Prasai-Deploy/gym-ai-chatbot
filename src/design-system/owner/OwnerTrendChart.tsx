import React, { useState } from 'react';
import { cn } from '../tokens';

export type OwnerMetricType = 'revenue' | 'members' | 'attendance' | 'retention';

export interface OwnerTrendChartProps {
  className?: string;
}

const OWNER_METRIC_DATA: Record<OwnerMetricType, { label: string; currentVal: string; change: string; points: number[]; unit: string }> = {
  revenue: {
    label: 'Revenue (MRR)',
    currentVal: '$48,250',
    change: '+8.4% vs last mo',
    unit: 'USD',
    points: [41000, 41800, 42500, 43200, 44000, 44800, 45500, 46200, 47000, 47400, 47900, 48250],
  },
  members: {
    label: 'Active Members',
    currentVal: '1,240',
    change: '+48 new this month',
    unit: 'members',
    points: [1080, 1095, 1110, 1130, 1145, 1160, 1180, 1195, 1210, 1220, 1232, 1240],
  },
  attendance: {
    label: 'Daily Check-ins',
    currentVal: '680',
    change: '85% peak load',
    unit: 'visits/day',
    points: [520, 540, 560, 580, 600, 615, 630, 645, 660, 670, 675, 680],
  },
  retention: {
    label: 'Member Retention',
    currentVal: '96.2%',
    change: '+1.1% vs industry avg',
    unit: 'rate',
    points: [94.5, 94.8, 95.0, 95.2, 95.5, 95.7, 95.8, 96.0, 96.1, 96.1, 96.2, 96.2],
  },
};

export const OwnerTrendChart: React.FC<OwnerTrendChartProps> = React.memo(({ className }) => {
  const [selectedMetric, setSelectedMetric] = useState<OwnerMetricType>('revenue');

  const currentData = OWNER_METRIC_DATA[selectedMetric];
  const points = currentData.points;
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 160;
  const paddingX = 20;
  const paddingY = 20;

  const svgPoints = points.map((val, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((val - minVal) / range) * (height - 2 * paddingY);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-5 select-none shadow-sm', className)}>
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">
            Operational Performance (12-Week Trend)
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-extrabold text-white font-display tracking-tight tabular-nums">
              {currentData.currentVal}
            </span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums font-mono">
              {currentData.change}
            </span>
          </div>
        </div>

        {/* Minimal Pill Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-x-auto self-start sm:self-auto">
          {(['revenue', 'members', 'attendance', 'retention'] as OwnerMetricType[]).map((metric) => (
            <button
              key={metric}
              type="button"
              onClick={() => setSelectedMetric(metric)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                selectedMetric === metric
                  ? 'bg-orange-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {metric}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Trendline */}
      <div className="w-full relative h-[160px] flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />

          <polyline
            fill="none"
            stroke="#F97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={svgPoints}
          />

          {points.length > 0 && (
            <circle
              cx={width - paddingX}
              cy={height - paddingY - ((points[points.length - 1] - minVal) / range) * (height - 2 * paddingY)}
              r="4.5"
              fill="#F97316"
              stroke="#11141D"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Time Axis Labels */}
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-1 border-t border-white/[0.04] pt-2">
        <span>Week 1</span>
        <span>Week 6</span>
        <span>Week 12 (Current)</span>
      </div>
    </div>
  );
});

OwnerTrendChart.displayName = 'OwnerTrendChart';
