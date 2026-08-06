import React from 'react';
import { Dumbbell, Activity } from '../icons';
import { cn } from '../tokens';

export interface ExerciseMediaProps {
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  imageUrl?: string;
  className?: string;
}

export const ExerciseMedia: React.FC<ExerciseMediaProps> = React.memo(({
  exerciseName,
  muscleGroup,
  equipment,
  imageUrl,
  className,
}) => {
  return (
    <div className={cn('relative w-full h-48 sm:h-64 rounded-3xl bg-slate-950/80 border border-white/10 overflow-hidden flex items-center justify-center select-none', className)}>
      {imageUrl ? (
        <img src={imageUrl} alt={exerciseName} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Dumbbell className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold text-slate-400">Exercise Diagram & Form Visual</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="px-3 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-xs font-bold text-orange-400">
          {muscleGroup}
        </span>
        <span className="px-3 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-300">
          {equipment}
        </span>
      </div>
    </div>
  );
});

ExerciseMedia.displayName = 'ExerciseMedia';
