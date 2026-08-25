import React from 'react';
import { Button } from '../components/Button';
import { Play, Flame, Clock, Dumbbell } from '../icons';
import { QueueExercise } from './ExerciseQueue';
import { cn } from '../tokens';

export interface MinimalWorkoutHeroProps {
  routineTitle: string;
  category?: string;
  durationMinutes?: number;
  description?: string;
  exercises?: QueueExercise[];
  onStartWorkout: () => void;
  className?: string;
}

export const MinimalWorkoutHero: React.FC<MinimalWorkoutHeroProps> = React.memo(({
  routineTitle,
  category = 'Hypertrophy • Push Cycle',
  durationMinutes = 52,
  description = "Today's training is focused on chest, shoulders and triceps.",
  exercises = [],
  onStartWorkout,
  className,
}) => {
  return (
    <div className={cn('w-full max-w-xl mx-auto flex flex-col gap-6 sm:gap-8 select-none py-2', className)}>
      {/* 1. Workout Identity Card */}
      <div className="rounded-2xl bg-[#11141D] border border-white/[0.07] p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {durationMinutes} min
          </span>
          <span>•</span>
          <span className="uppercase tracking-wider text-[11px] font-bold text-orange-400">
            {category}
          </span>
        </div>

        <div className="flex flex-col gap-2 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight leading-tight">
            {routineTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            {description}
          </p>
        </div>

        {/* Dominant Primary Action */}
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:w-64 font-bold text-sm tracking-wide mt-2 shadow-md shadow-orange-500/20"
          leftIcon={<Play className="w-4 h-4 fill-current" />}
          onClick={onStartWorkout}
        >
          Start Workout
        </Button>
      </div>

      {/* 2. Planned Exercise Sequence Preview */}
      {exercises.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">
              Planned Exercises ({exercises.length})
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {exercises.map((ex, idx) => (
              <div
                key={ex.id || idx}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#11141D]/70 border border-white/[0.05] text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white/[0.04] text-slate-400 font-bold flex items-center justify-center text-[10px] tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-white tracking-tight">{ex.name}</span>
                    <span className="text-[10px] text-slate-400">{ex.muscleGroup}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                  {ex.targetSets} sets
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

MinimalWorkoutHero.displayName = 'MinimalWorkoutHero';
