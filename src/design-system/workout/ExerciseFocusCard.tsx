import React from 'react';
import { Card } from '../components/Card';
import { ExerciseMedia } from './ExerciseMedia';
import { ExerciseTips } from './ExerciseTips';
import { SetLogger } from './SetLogger';
import { SetData } from './SetRow';
import { Badge } from '../components/Badge';

export interface ExerciseFocusCardProps {
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  sets: SetData[];
  tips?: string[];
  coachNote?: string;
  onUpdateSet: (setId: string, field: 'weightKg' | 'reps', value: string) => void;
  onToggleCompleteSet: (setId: string) => void;
  onAddSet?: () => void;
  className?: string;
}

export const ExerciseFocusCard: React.FC<ExerciseFocusCardProps> = React.memo(({
  exerciseName,
  muscleGroup,
  equipment,
  sets,
  tips,
  coachNote,
  onUpdateSet,
  onToggleCompleteSet,
  onAddSet,
  className,
}) => {
  return (
    <Card variant="workout" className={`p-6 flex flex-col gap-6 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Badge variant="primary" size="sm">ACTIVE EXERCISE FOCUS</Badge>
          <h2 className="text-2xl font-black text-white tracking-tight font-display">{exerciseName}</h2>
        </div>
        <Badge variant="neutral" size="sm">{sets.length} Sets Total</Badge>
      </div>

      <ExerciseMedia exerciseName={exerciseName} muscleGroup={muscleGroup} equipment={equipment} />
      <ExerciseTips tips={tips} coachNote={coachNote} />
      <SetLogger
        sets={sets}
        onUpdateSet={onUpdateSet}
        onToggleCompleteSet={onToggleCompleteSet}
        onAddSet={onAddSet}
      />
    </Card>
  );
});

ExerciseFocusCard.displayName = 'ExerciseFocusCard';
