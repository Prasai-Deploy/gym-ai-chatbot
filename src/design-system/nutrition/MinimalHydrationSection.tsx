import React, { useState, useEffect } from 'react';
import { Progress } from '../components/Progress';
import { Droplets, Plus, AlertCircle, Check } from '../icons';
import { cn } from '../tokens';

export interface MinimalHydrationSectionProps {
  initialLiters?: number;
  targetLiters?: number;
  isTelemetryOffline?: boolean;
  onLogWater?: (amountMl: number) => Promise<any> | void;
  className?: string;
}

export const MinimalHydrationSection: React.FC<MinimalHydrationSectionProps> = React.memo(({
  initialLiters,
  targetLiters = 2.5,
  isTelemetryOffline = false,
  onLogWater,
  className,
}) => {
  const [hydrationLiters, setHydrationLiters] = useState<number>(initialLiters ?? 0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialLiters !== undefined) {
      setHydrationLiters(initialLiters);
    }
  }, [initialLiters]);

  const percentage = Math.min(Math.round(((hydrationLiters || 0) / (targetLiters || 1)) * 100), 100);

  const handleAddWater = async (ml: number) => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      if (onLogWater) {
        await onLogWater(ml);
      }
      setHydrationLiters((prev) => Math.min(Math.round((prev + ml / 1000) * 10) / 10, 6.0));
      setStatusMessage({ text: `+${ml}ml logged`, isError: false });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to record water intake. Please try again.';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col gap-4 shadow-sm select-none', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
          <Droplets className="w-4 h-4" />
          Hydration
        </span>
        <span className="text-xs font-bold text-white font-display tabular-nums">
          {isTelemetryOffline ? '--' : `${percentage}%`}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold text-white font-display tracking-tight tabular-nums">
          {isTelemetryOffline ? '--' : hydrationLiters}{' '}
          <span className="text-xs text-slate-400 font-sans font-normal">/ {targetLiters} L</span>
        </span>
      </div>

      <Progress value={isTelemetryOffline ? 0 : hydrationLiters} max={targetLiters} variant="primary" size="sm" />

      {statusMessage && (
        <div
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
            statusMessage.isError
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
          )}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          ) : (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span className="truncate">{statusMessage.text}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleAddWater(250)}
          className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] border border-white/[0.08] text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>+ 250 ml</span>
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleAddWater(500)}
          className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] border border-white/[0.08] text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>+ 500 ml</span>
        </button>
      </div>
    </div>
  );
});

MinimalHydrationSection.displayName = 'MinimalHydrationSection';
