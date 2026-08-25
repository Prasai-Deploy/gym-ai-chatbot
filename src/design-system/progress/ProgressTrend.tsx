import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../tokens';

export type ProgressMetricType = 'strength' | 'weight' | 'bodyFat' | 'consistency';

export interface ProgressTrendProps {
  className?: string;
}

const METRIC_DATA: Record<ProgressMetricType, { label: string; currentVal: string; change: string; points: number[]; unit: string }> = {
  strength: {
    label: 'Strength Index',
    currentVal: '114.5',
    change: '+14.5%',
    unit: 'pts',
    points: [100, 101.5, 103, 102.8, 105, 106.5, 108, 107.8, 110, 111.5, 113, 114.5],
  },
  weight: {
    label: 'Body Weight',
    currentVal: '78.2',
    change: '-1.8 kg',
    unit: 'kg',
    points: [80.0, 79.8, 79.5, 79.6, 79.2, 78.9, 78.8, 78.6, 78.5, 78.4, 78.3, 78.2],
  },
  bodyFat: {
    label: 'Body Fat',
    currentVal: '14.2',
    change: '-2.1%',
    unit: '%',
    points: [16.3, 16.1, 15.9, 15.8, 15.5, 15.3, 15.1, 14.9, 14.8, 14.6, 14.4, 14.2],
  },
  consistency: {
    label: 'Weekly Workouts',
    currentVal: '4.4',
    change: '+18%',
    unit: 'sess/wk',
    points: [3.0, 3.5, 4.0, 3.5, 4.0, 4.5, 4.0, 4.5, 4.0, 4.5, 4.5, 4.4],
  },
};

export const ProgressTrend: React.FC<ProgressTrendProps> = React.memo(({ className }) => {
  const [selectedMetric, setSelectedMetric] = useState<ProgressMetricType>('strength');

  const currentData = METRIC_DATA[selectedMetric];
  const points = currentData.points;
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  // Chart dimensions
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
      {/* 1. Header & Metric Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">
            Primary Trend (Last 12 Weeks)
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-extrabold text-white font-display tracking-tight tabular-nums">
              {currentData.currentVal} <span className="text-xs text-slate-400 font-sans font-normal">{currentData.unit}</span>
            </span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums font-mono">
              {currentData.change}
            </span>
          </div>
        </div>

        {/* Minimal Pill Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-x-auto self-start sm:self-auto">
          {(['strength', 'weight', 'bodyFat', 'consistency'] as ProgressMetricType[]).map((metric) => (
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
              {metric === 'bodyFat' ? 'Body Fat' : metric}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Calm SVG Line Chart */}
      <div className="w-full relative h-[160px] flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Subtle horizontal baseline grid */}
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

          {/* Trend Polyline */}
          <polyline
            fill="none"
            stroke="#F97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={svgPoints}
          />

          {/* Last Data Point Accent */}
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

      {/* 3. Time Axis Labels */}
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-1 border-t border-white/[0.04] pt-2">
        <span>Week 1</span>
        <span>Week 6</span>
        <span>Week 12 (Current)</span>
      </div>
    </div>
  );
});

ProgressTrend.displayName = 'ProgressTrend';
