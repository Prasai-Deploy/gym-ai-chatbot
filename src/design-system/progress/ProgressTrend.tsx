import React, { useState } from 'react';
import { LineChart, Calendar, AlertCircle } from '../icons';
import { cn } from '../tokens';

export interface ProgressTrendProps {
  hasHistory?: boolean;
  trendPoints?: number[];
  className?: string;
}

export const ProgressTrend: React.FC<ProgressTrendProps> = React.memo(({
  hasHistory = false,
  trendPoints = [],
  className,
}) => {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const points = trendPoints;
  const hasValidChartData = hasHistory && points.length >= 2;

  // Chart dimensions
  const width = 600;
  const height = 160;
  const paddingX = 20;
  const paddingY = 20;

  const minVal = points.length ? Math.min(...points) : 0;
  const maxVal = points.length ? Math.max(...points) : 100;
  const range = maxVal - minVal || 1;

  const svgPoints = hasValidChartData
    ? points.map((val, idx) => {
        const x = paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
        const y = height - paddingY - ((val - minVal) / range) * (height - 2 * paddingY);
        return `${x},${y}`;
      }).join(' ')
    : '';

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4 select-none shadow-sm', className)}>
      {/* Header with Title & Date-Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
              Workout Volume Trend
            </h3>
            <p className="text-xs text-slate-400">Track your total weight lifted over time</p>
          </div>
        </div>

        {/* Date-Range Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#181C28]/60 border border-white/[0.06] rounded-xl self-start sm:self-auto">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={cn(
                'min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer',
                selectedRange === r
                  ? 'bg-lime-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas or Honest Empty State */}
      {!hasValidChartData ? (
        <div className="w-full py-10 px-4 rounded-xl bg-[#181C28]/30 border border-dashed border-white/[0.08] flex flex-col items-center justify-center text-center gap-2">
          <Calendar className="w-6 h-6 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-300">Not Enough History Yet</h4>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Complete at least two workouts to see your volume trend over time.
          </p>
        </div>
      ) : (
        <div className="w-full relative pt-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 overflow-visible">
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#CCFF00" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="#CCFF00"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgPoints}
            />
          </svg>
        </div>
      )}
    </div>
  );
});

ProgressTrend.displayName = 'ProgressTrend';
