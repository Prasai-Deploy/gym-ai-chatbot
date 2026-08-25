import React, { useState } from 'react';
import { Progress } from '../components/Progress';
import { Droplets, Plus } from '../icons';
import { cn } from '../tokens';

export interface MinimalHydrationSectionProps {
  initialLiters?: number;
  targetLiters?: number;
  onLogWater?: (amountMl: number) => void;
  className?: string;
}

export const MinimalHydrationSection: React.FC<MinimalHydrationSectionProps> = React.memo(({
  initialLiters = 1.8,
  targetLiters = 2.5,
  onLogWater,
  className,
}) => {
  const [hydrationLiters, setHydrationLiters] = useState(initialLiters);
  const percentage = Math.min(Math.round((hydrationLiters / (targetLiters || 1)) * 100), 100);

  const handleAddWater = (ml: number) => {
    const nextLiters = Math.min(Math.round((hydrationLiters + ml / 1000) * 10) / 10, 6.0);
    setHydrationLiters(nextLiters);
    onLogWater?.(ml);
  };

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col gap-4 shadow-sm select-none', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-[0.12em] flex items-center gap-1.5 font-sans">
          <Droplets className="w-4 h-4" />
          Hydration
        </span>
        <span className="text-xs font-bold text-white font-display tabular-nums">
          {percentage}%
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold text-white font-display tracking-tight tabular-nums">
          {hydrationLiters} <span className="text-xs text-slate-400 font-sans font-normal">/ {targetLiters} L</span>
        </span>
      </div>

      <Progress value={hydrationLiters} max={targetLiters} variant="primary" size="sm" />

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleAddWater(250)}
          className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.06] text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Plus className="w-3 h-3" />
          <span>250 ml</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddWater(500)}
          className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.06] text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Plus className="w-3 h-3" />
          <span>500 ml</span>
        </button>
      </div>
    </div>
  );
});

MinimalHydrationSection.displayName = 'MinimalHydrationSection';
