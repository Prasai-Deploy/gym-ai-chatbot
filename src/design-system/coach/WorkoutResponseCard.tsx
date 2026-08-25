import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Flame, Play, Check } from '../icons';

export interface ExerciseSetDetail {
  name: string;
  sets: number;
  reps: string;
  weightTarget?: string;
}

export interface WorkoutResponseCardProps {
  title: string;
  category: string;
  durationMin: number;
  exercises: ExerciseSetDetail[];
  onLoadWorkout?: () => void;
  className?: string;
}

export const WorkoutResponseCard: React.FC<WorkoutResponseCardProps> = React.memo(({
  title,
  category,
  durationMin,
  exercises,
  onLoadWorkout,
  className,
}) => {
  return (
    <Card variant="workout" className={`p-5 flex flex-col gap-4 select-none my-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="primary" size="sm" icon={<Flame className="w-3.5 h-3.5" />}>
          AI RECOMMENDED WORKOUT
        </Badge>
        <span className="text-xs font-mono font-bold text-brand-400">{durationMin} min</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{category}</span>
        <h3 className="text-lg font-extrabold text-white tracking-tight">{title}</h3>
      </div>

      <div className="flex flex-col gap-2 bg-slate-950/60 p-3 rounded-2xl border border-white/5">
        {exercises.map((ex, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-none">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px]">
                {idx + 1}
              </span>
              {ex.name}
            </span>
            <span className="text-slate-400 font-medium">
              {ex.sets} sets × {ex.reps} {ex.weightTarget ? `(${ex.weightTarget})` : ''}
            </span>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="md"
        leftIcon={<Play className="w-4 h-4 fill-white" />}
        onClick={onLoadWorkout}
        className="w-full"
      >
        Load Routine into Workout Engine
      </Button>
    </Card>
  );
});

WorkoutResponseCard.displayName = 'WorkoutResponseCard';
