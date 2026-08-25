import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { Progress } from '../components/Progress';
import { Minus, Plus, Check, ChevronLeft, ChevronRight, Bot, Sparkles } from '../icons';
import { SetData } from './SetRow';
import { cn } from '../tokens';

export interface ActiveTrainingViewProps {
  exerciseIndex: number;
  totalExercises: number;
  exerciseName: string;
  muscleGroup?: string;
  currentSetNumber: number;
  totalSets: number;
  currentWeightKg: number;
  currentReps: number;
  previousBest?: string;
  targetRange?: string;
  rpe?: number;
  onWeightChange: (newWeight: number) => void;
  onRepsChange: (newReps: number) => void;
  onCompleteSet: () => void;
  onPrevExercise?: () => void;
  onNextExercise?: () => void;
  onFinishWorkout?: () => void;
  onAskTrinity?: () => void;
  hasPrevExercise: boolean;
  hasNextExercise: boolean;
  className?: string;
}

export const ActiveTrainingView: React.FC<ActiveTrainingViewProps> = React.memo(({
  exerciseIndex,
  totalExercises,
  exerciseName,
  muscleGroup,
  currentSetNumber,
  totalSets,
  currentWeightKg,
  currentReps,
  previousBest = '75 kg × 10',
  targetRange = '8–10 reps',
  rpe,
  onWeightChange,
  onRepsChange,
  onCompleteSet,
  onPrevExercise,
  onNextExercise,
  onFinishWorkout,
  onAskTrinity,
  hasPrevExercise,
  hasNextExercise,
  className,
}) => {
  const percentComplete = Math.round(((exerciseIndex + (currentSetNumber - 1) / totalSets) / totalExercises) * 100);

  return (
    <div className={cn('w-full max-w-xl mx-auto flex flex-col gap-5 select-none py-1', className)}>
      {/* 1. Subtle Top Exercise Progress Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-400 font-sans">
            Exercise {exerciseIndex + 1} of {totalExercises}
          </span>
          <span className="text-slate-400 tabular-nums font-mono">{percentComplete}% complete</span>
        </div>
        <Progress value={percentComplete} max={100} variant="primary" size="sm" />
      </div>

      {/* 2. Exercise Title & Target */}
      <div className="flex flex-col items-center text-center gap-1 mt-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          {exerciseName}
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          Target: {totalSets} sets × {targetRange}
          {muscleGroup && ` • ${muscleGroup}`}
        </span>
      </div>

      {/* 3. Central Training Card: Set, Weight & Rep Controls */}
      <div className="rounded-2xl bg-[#11141D] border border-white/[0.08] p-6 sm:p-7 flex flex-col gap-6 shadow-sm">
        {/* Set Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-[0.14em] font-sans">
            SET {currentSetNumber} OF {totalSets}
          </span>
          {previousBest && (
            <span className="text-xs text-slate-400 font-medium">
              Prev: <span className="text-slate-200">{previousBest}</span>
            </span>
          )}
        </div>

        {/* Dual Input Controls: Weight & Reps */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {/* Weight Control */}
          <div className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#181C28]/80 border border-white/[0.05]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Weight</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-white font-display tabular-nums">
                {currentWeightKg}
              </span>
              <span className="text-xs font-semibold text-slate-400">kg</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => onWeightChange(Math.max(0, currentWeightKg - 2.5))}
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Decrease weight by 2.5 kg"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onWeightChange(currentWeightKg + 2.5)}
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Increase weight by 2.5 kg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reps Control */}
          <div className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#181C28]/80 border border-white/[0.05]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reps</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-white font-display tabular-nums">
                {currentReps}
              </span>
              <span className="text-xs font-semibold text-slate-400">reps</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => onRepsChange(Math.max(1, currentReps - 1))}
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Decrease reps"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onRepsChange(currentReps + 1)}
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-label="Increase reps"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Primary Dominant Action: COMPLETE SET */}
        <Button
          variant="primary"
          size="lg"
          className="w-full font-bold text-base py-3.5 shadow-md shadow-orange-500/25"
          leftIcon={<Check className="w-5 h-5 stroke-[2.5]" />}
          onClick={onCompleteSet}
        >
          Complete Set
        </Button>
      </div>

      {/* 4. Quiet Contextual AI Coach Prompt */}
      {onAskTrinity && (
        <button
          type="button"
          onClick={onAskTrinity}
          className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 hover:border-indigo-500/35 text-xs text-indigo-300 transition-all select-none group"
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400 group-hover:scale-105 transition-transform" />
            <span className="font-medium text-slate-300">Need form or pacing guidance?</span>
          </div>
          <span className="font-bold text-indigo-400 group-hover:text-indigo-300">Ask Trinity →</span>
        </button>
      )}

      {/* 5. Exercise Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        {hasPrevExercise ? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            onClick={onPrevExercise}
          >
            Prev Exercise
          </Button>
        ) : (
          <div />
        )}

        {hasNextExercise ? (
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ChevronRight className="w-4 h-4" />}
            onClick={onNextExercise}
          >
            Next Exercise
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={onFinishWorkout}
          >
            Finish Workout
          </Button>
        )}
      </div>
    </div>
  );
});

ActiveTrainingView.displayName = 'ActiveTrainingView';
