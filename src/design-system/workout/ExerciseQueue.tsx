import React from 'react';
import { Badge } from '../components/Badge';
import { Dumbbell, CheckCircle2, ChevronRight } from '../icons';
import { cn } from '../tokens';

export interface QueueExercise {
  id: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  completedSets: number;
  status: 'completed' | 'active' | 'upcoming';
}

export interface ExerciseQueueProps {
  exercises: QueueExercise[];
  activeExerciseId: string;
  onSelectExercise: (id: string) => void;
  className?: string;
}

export const ExerciseQueue: React.FC<ExerciseQueueProps> = React.memo(({
  exercises,
  activeExerciseId,
  onSelectExercise,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2 select-none', className)}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Routine Queue</span>
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
        {exercises.map((ex, idx) => {
          const isActive = ex.id === activeExerciseId;
          return (
            <div
              key={ex.id}
              onClick={() => onSelectExercise(ex.id)}
              className={cn(
                'p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group',
                isActive
                  ? 'bg-brand-500/15 border-brand-500/50 shadow-md shadow-brand-500/10'
                  : ex.status === 'completed'
                  ? 'bg-slate-900/60 border-white/5 opacity-75'
                  : 'bg-slate-900 border-white/10 hover:border-white/20'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
                    ex.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isActive
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400'
                  )}
                >
                  {ex.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>

                <div className="flex flex-col">
                  <span className={cn('text-xs font-bold', isActive ? 'text-brand-400' : 'text-white')}>
                    {ex.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {ex.muscleGroup} • {ex.completedSets}/{ex.targetSets} sets
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
});

ExerciseQueue.displayName = 'ExerciseQueue';
