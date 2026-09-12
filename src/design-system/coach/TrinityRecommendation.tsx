import React from 'react';
import { Button } from '../components/Button';
import { Play, Dumbbell, Utensils, Moon } from '../icons';
import { cn } from '../tokens';

export interface TrinityRecommendationProps {
  workoutName?: string;
  workoutNote?: string;
  nutritionNote?: string;
  recoveryNote?: string;
  onStartWorkout?: () => void;
  className?: string;
}

export const TrinityRecommendation: React.FC<TrinityRecommendationProps> = React.memo(({
  workoutName = 'Train Upper Body',
  workoutNote = 'Keep intensity high on your main lifts and track your RPE.',
  nutritionNote = 'Aim for 150g protein and hydrate with 2.5L water.',
  recoveryNote = 'Get to bed before 11:30 PM to consolidate neuromuscular recovery.',
  onStartWorkout,
  className,
}) => {
  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-5 select-none shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-[0.12em] font-sans">
          Today's Recommendation
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Workout Plan */}
        <div className="p-3.5 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-bold text-white tracking-tight">{workoutName}</span>
            <p className="text-xs text-slate-300 font-normal leading-relaxed">{workoutNote}</p>
          </div>
        </div>

        {/* Nutrition Plan */}
        <div className="p-3.5 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <Utensils className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-bold text-white tracking-tight">Nutrition</span>
            <p className="text-xs text-slate-300 font-normal leading-relaxed">{nutritionNote}</p>
          </div>
        </div>

        {/* Recovery Protocol */}
        <div className="p-3.5 rounded-xl bg-[#181C28]/60 border border-white/[0.04] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
            <Moon className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-bold text-white tracking-tight">Recovery</span>
            <p className="text-xs text-slate-300 font-normal leading-relaxed">{recoveryNote}</p>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      {onStartWorkout && (
        <Button
          variant="primary"
          size="md"
          className="w-full font-bold shadow-md shadow-orange-500/20 mt-1"
          leftIcon={<Play className="w-4 h-4 fill-current" />}
          onClick={onStartWorkout}
        >
          Start Workout
        </Button>
      )}
    </div>
  );
});

TrinityRecommendation.displayName = 'TrinityRecommendation';
