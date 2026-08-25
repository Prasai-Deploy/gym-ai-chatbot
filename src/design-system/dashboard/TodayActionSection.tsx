import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Progress } from '../components/Progress';
import { Flame, Droplets, Utensils, Play, Plus } from '../icons';
import { cn } from '../tokens';

export interface TodayActionSectionProps {
  workoutName?: string;
  workoutDurationMin?: number;
  caloriesLogged?: number;
  caloriesTarget?: number;
  proteinLoggedGrams?: number;
  proteinTargetGrams?: number;
  initialHydrationLiters?: number;
  targetHydrationLiters?: number;
  onStartWorkout?: () => void;
  onOpenNutrition?: () => void;
  className?: string;
}

export const TodayActionSection: React.FC<TodayActionSectionProps> = React.memo(({
  workoutName = 'Upper Body Push & Core',
  workoutDurationMin = 52,
  caloriesLogged = 2240,
  caloriesTarget = 2650,
  proteinLoggedGrams = 148,
  proteinTargetGrams = 180,
  initialHydrationLiters = 1.8,
  targetHydrationLiters = 2.5,
  onStartWorkout,
  onOpenNutrition,
  className,
}) => {
  const [hydration, setHydration] = useState(initialHydrationLiters);

  const addHydration = (amountLiters: number) => {
    setHydration((prev) => Math.min(Math.round((prev + amountLiters) * 10) / 10, 5.0));
  };

  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-[0.12em] font-sans">
          Today's Focus
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Primary Action: Workout Card */}
        <div className="rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-white/[0.12] transition-all">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Workout
              </span>
              <span className="text-xs text-slate-400 font-medium tabular-nums">{workoutDurationMin} min</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight leading-snug">
              {workoutName}
            </h3>
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full font-bold shadow-sm shadow-orange-500/20"
            leftIcon={<Play className="w-4 h-4 fill-current" />}
            onClick={onStartWorkout}
          >
            Start Workout
          </Button>
        </div>

        {/* 2. Nutrition Summary Card */}
        <div
          onClick={onOpenNutrition}
          className="rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-white/[0.12] transition-all cursor-pointer group select-none"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" />
                Nutrition
              </span>
              <span className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">
                View Log →
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-bold text-white font-display tabular-nums">
                  {caloriesLogged.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-normal ml-1">
                  / {caloriesTarget.toLocaleString()} kcal
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                {proteinLoggedGrams}g / {proteinTargetGrams}g protein
              </span>
            </div>
          </div>

          <Progress
            value={caloriesLogged}
            max={caloriesTarget}
            variant="success"
            size="sm"
          />
        </div>

        {/* 3. Hydration Card */}
        <div className="rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 flex flex-col justify-between gap-4 shadow-sm select-none">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" />
                Hydration
              </span>
              <span className="text-xs font-bold text-white font-display tabular-nums">
                {hydration} / {targetHydrationLiters} L
              </span>
            </div>

            <Progress
              value={hydration}
              max={targetHydrationLiters}
              variant="primary"
              size="sm"
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addHydration(0.25)}
              className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <Plus className="w-3 h-3" />
              <span>250 ml</span>
            </button>
            <button
              type="button"
              onClick={() => addHydration(0.5)}
              className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <Plus className="w-3 h-3" />
              <span>500 ml</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

TodayActionSection.displayName = 'TodayActionSection';
