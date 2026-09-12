import React from 'react';
import { Button } from '../components/Button';
import { CheckCircle2, ArrowRight, Flame, Clock, Dumbbell } from '../icons';
import { cn } from '../tokens';

export interface MinimalCompletionViewProps {
  routineTitle: string;
  durationSeconds: number;
  totalExercises: number;
  totalVolumeKg?: number;
  caloriesBurned?: number;
  onDone: () => void;
  onViewProgress?: () => void;
  className?: string;
}

export const MinimalCompletionView: React.FC<MinimalCompletionViewProps> = React.memo(({
  routineTitle,
  durationSeconds,
  totalExercises,
  totalVolumeKg = 4820,
  caloriesBurned = 520,
  onDone,
  onViewProgress,
  className,
}) => {
  const durationMin = Math.floor(durationSeconds / 60);

  return (
    <div className={cn('w-full max-w-lg mx-auto flex flex-col items-center text-center gap-6 select-none py-6', className)}>
      {/* 1. Success Indicator */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
        <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
      </div>

      {/* 2. Completion Title & Routine Context */}
      <div className="flex flex-col gap-1.5 max-w-md">
        <span className="text-[11px] font-bold text-orange-400 uppercase tracking-[0.16em]">
          Workout Complete
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          {routineTitle}
        </h1>
        <span className="text-xs text-slate-400 font-medium">
          {totalExercises} / {totalExercises} exercises completed
        </span>
      </div>

      {/* 3. 3 Core Metric Summaries */}
      <div className="grid grid-cols-3 gap-3 w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 shadow-sm">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Dumbbell className="w-3 h-3 text-slate-400" />
            Volume
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {totalVolumeKg.toLocaleString()} kg
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 border-x border-white/[0.06]">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Flame className="w-3 h-3 text-slate-400" />
            Calories
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {caloriesBurned} kcal
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Duration
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-display tabular-nums">
            {durationMin} min
          </span>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col gap-3 w-full sm:w-72 mt-2">
        <Button
          variant="primary"
          size="lg"
          className="w-full font-bold shadow-md shadow-orange-500/20"
          onClick={onDone}
        >
          Done
        </Button>

        {onViewProgress && (
          <button
            type="button"
            onClick={onViewProgress}
            className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-2"
          >
            <span>View Progress</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

MinimalCompletionView.displayName = 'MinimalCompletionView';
