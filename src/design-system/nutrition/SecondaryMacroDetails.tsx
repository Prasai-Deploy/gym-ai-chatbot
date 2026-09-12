import React from 'react';
import { Progress } from '../components/Progress';
import { cn } from '../tokens';

export interface SecondaryMacroDetailsProps {
  proteinGrams?: number;
  proteinTarget?: number;
  carbsGrams?: number;
  carbsTarget?: number;
  fatGrams?: number;
  fatTarget?: number;
  className?: string;
}

export const SecondaryMacroDetails: React.FC<SecondaryMacroDetailsProps> = React.memo(({
  proteinGrams = 148,
  proteinTarget = 180,
  carbsGrams = 210,
  carbsTarget = 280,
  fatGrams = 62,
  fatTarget = 75,
  className,
}) => {
  return (
    <div className={cn('w-full flex flex-col gap-3 select-none', className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans">
          Macronutrient Breakdown
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Protein */}
        <div className="p-3.5 rounded-xl bg-[#11141D] border border-white/[0.06] flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Protein</span>
            <span className="text-emerald-400 font-bold tabular-nums font-display">
              {proteinGrams}g <span className="text-slate-400 font-normal font-sans">/ {proteinTarget}g</span>
            </span>
          </div>
          <Progress value={proteinGrams} max={proteinTarget} variant="success" size="sm" />
        </div>

        {/* Carbs */}
        <div className="p-3.5 rounded-xl bg-[#11141D] border border-white/[0.06] flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Carbs</span>
            <span className="text-amber-400 font-bold tabular-nums font-display">
              {carbsGrams}g <span className="text-slate-400 font-normal font-sans">/ {carbsTarget}g</span>
            </span>
          </div>
          <Progress value={carbsGrams} max={carbsTarget} variant="warning" size="sm" />
        </div>

        {/* Fat */}
        <div className="p-3.5 rounded-xl bg-[#11141D] border border-white/[0.06] flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Fat</span>
            <span className="text-orange-400 font-bold tabular-nums font-display">
              {fatGrams}g <span className="text-slate-400 font-normal font-sans">/ {fatTarget}g</span>
            </span>
          </div>
          <Progress value={fatGrams} max={fatTarget} variant="primary" size="sm" />
        </div>
      </div>
    </div>
  );
});

SecondaryMacroDetails.displayName = 'SecondaryMacroDetails';
