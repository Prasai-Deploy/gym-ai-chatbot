import React from 'react';
import { Button } from '../components/Button';
import { ChevronLeft, ChevronRight, RefreshCw, Check } from '../icons';

export interface WorkoutControlsProps {
  onPrevExercise: () => void;
  onNextExercise: () => void;
  onStartRestTimer: () => void;
  onFinishWorkout: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  className?: string;
}

export const WorkoutControls: React.FC<WorkoutControlsProps> = React.memo(({
  onPrevExercise,
  onNextExercise,
  onStartRestTimer,
  onFinishWorkout,
  hasPrev = true,
  hasNext = true,
  className,
}) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-white/10 select-none ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="md"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={onPrevExercise}
          disabled={!hasPrev}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="md"
          leftIcon={<RefreshCw className="w-4 h-4 text-brand-400" />}
          onClick={onStartRestTimer}
        >
          Rest Timer
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {hasNext ? (
          <Button
            variant="primary"
            size="md"
            rightIcon={<ChevronRight className="w-4 h-4" />}
            onClick={onNextExercise}
          >
            Next Exercise
          </Button>
        ) : (
          <Button
            variant="success"
            size="md"
            rightIcon={<Check className="w-4 h-4 stroke-[3]" />}
            onClick={onFinishWorkout}
          >
            Finish & Save Workout
          </Button>
        )}
      </div>
    </div>
  );
});

WorkoutControls.displayName = 'WorkoutControls';
