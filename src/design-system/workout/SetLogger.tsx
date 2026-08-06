import React from 'react';
import { SetRow, SetData } from './SetRow';
import { Button } from '../components/Button';
import { Plus } from '../icons';

export interface SetLoggerProps {
  sets: SetData[];
  onUpdateSet: (setId: string, field: 'weightKg' | 'reps', value: string) => void;
  onToggleCompleteSet: (setId: string) => void;
  onAddSet?: () => void;
  className?: string;
}

export const SetLogger: React.FC<SetLoggerProps> = React.memo(({
  sets,
  onUpdateSet,
  onToggleCompleteSet,
  onAddSet,
  className,
}) => {
  return (
    <div className={`flex flex-col gap-3 select-none ${className}`}>
      <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
        <span className="col-span-2 text-center">Set</span>
        <span className="col-span-3 text-center">Prev Best</span>
        <span className="col-span-3 text-center">Kg / Lbs</span>
        <span className="col-span-2 text-center">Reps</span>
        <span className="col-span-2 text-center">Done</span>
      </div>

      <div className="flex flex-col gap-2">
        {sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            onUpdateSet={(field, val) => onUpdateSet(set.id, field, val)}
            onToggleComplete={() => onToggleCompleteSet(set.id)}
          />
        ))}
      </div>

      {onAddSet && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAddSet}
          className="w-full mt-1"
        >
          Add Working Set
        </Button>
      )}
    </div>
  );
});

SetLogger.displayName = 'SetLogger';
