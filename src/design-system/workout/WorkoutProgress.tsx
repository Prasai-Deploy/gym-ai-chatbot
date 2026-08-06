import React from 'react';
import { Progress } from '../components/Progress';

export interface WorkoutProgressProps {
  currentExerciseIndex: number;
  totalExercises: number;
  completedSetsCount: number;
  totalSetsCount: number;
  className?: string;
}

export const WorkoutProgress: React.FC<WorkoutProgressProps> = React.memo(({
  currentExerciseIndex = 1,
  totalExercises = 5,
  completedSetsCount = 4,
  totalSetsCount = 18,
  className,
}) => {
  const percentage = Math.min(Math.round((completedSetsCount / totalSetsCount) * 100), 100);

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-2xl bg-slate-900/60 border border-white/5 select-none ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-300">
          Exercise <span className="text-white font-extrabold">{currentExerciseIndex + 1}</span> of {totalExercises}
        </span>
        <span className="text-orange-400 font-bold">{completedSetsCount} / {totalSetsCount} Sets Completed ({percentage}%)</span>
      </div>
      <Progress value={completedSetsCount} max={totalSetsCount} variant="primary" size="sm" />
    </div>
  );
});

WorkoutProgress.displayName = 'WorkoutProgress';
