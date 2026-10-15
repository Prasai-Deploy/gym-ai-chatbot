import React from 'react';
import { Check, Plus, AlertCircle, Utensils } from '../icons';
import { cn } from '../tokens';

export interface MealItem {
  id: string;
  name: string;
  description?: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatsGrams?: number;
  completed?: boolean;
  timeSlot?: string;
}

export interface ChronologicalMealListProps {
  meals?: MealItem[];
  isTelemetryOffline?: boolean;
  onOpenLogMeal?: () => void;
  className?: string;
}

export const ChronologicalMealList: React.FC<ChronologicalMealListProps> = React.memo(({
  meals = [],
  isTelemetryOffline = false,
  onOpenLogMeal,
  className,
}) => {
  return (
    <div className={cn('w-full flex flex-col gap-3.5 select-none', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans">
          Today's Meals
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">
            {isTelemetryOffline ? 'Telemetry Offline' : `${meals.length} Logged`}
          </span>
          {onOpenLogMeal && (
            <button
              type="button"
              onClick={onOpenLogMeal}
              className="px-2.5 py-1 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 text-lime-400 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Meal</span>
            </button>
          )}
        </div>
      </div>

      {isTelemetryOffline ? (
        <div className="p-5 rounded-2xl bg-[#11141D] border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-sans">Meal Logs Offline</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Table <code className="text-amber-300 font-mono text-[11px]">public.v2_nutrition_logs</code> is not yet applied in the database. Saved meals cannot be retrieved until schema migration runs.
              </p>
            </div>
          </div>
          {onOpenLogMeal && (
            <button
              type="button"
              onClick={onOpenLogMeal}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-bold text-white transition-colors shrink-0"
            >
              Test Meal Logger
            </button>
          )}
        </div>
      ) : meals.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#11141D] border border-white/[0.06] flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.04] text-slate-500 border border-white/[0.06]">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Meals Logged Today</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Keep your metabolism and macros on target by logging breakfast, lunch, dinner, or snacks.
            </p>
          </div>
          {onOpenLogMeal && (
            <button
              type="button"
              onClick={onOpenLogMeal}
              className="mt-2 px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-lime-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log First Meal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="p-4 rounded-xl border bg-[#11141D] border-white/[0.08] flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-tight text-white">
                      {meal.name}
                    </span>
                    {meal.timeSlot && (
                      <span className="text-[10px] text-slate-500 font-medium font-sans">
                        {meal.timeSlot}
                      </span>
                    )}
                  </div>
                  {meal.description && (
                    <p className="text-xs text-slate-400 truncate">
                      {meal.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-white font-display tabular-nums">
                    {meal.calories} <span className="text-xs font-normal text-slate-400 font-sans">kcal</span>
                  </span>
                  {meal.proteinGrams !== undefined && (
                    <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">
                      {meal.proteinGrams}g protein
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ChronologicalMealList.displayName = 'ChronologicalMealList';
