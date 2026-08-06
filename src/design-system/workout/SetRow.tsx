import React from 'react';
import { Check } from '../icons';
import { cn } from '../tokens';

export interface SetData {
  id: string;
  setNumber: number;
  previousBest?: string;
  weightKg: number | string;
  reps: number | string;
  completed: boolean;
}

export interface SetRowProps {
  set: SetData;
  onUpdateSet: (field: 'weightKg' | 'reps', value: string) => void;
  onToggleComplete: () => void;
  className?: string;
}

export const SetRow: React.FC<SetRowProps> = React.memo(({
  set,
  onUpdateSet,
  onToggleComplete,
  className,
}) => {
  return (
    <div
      className={cn(
        'grid grid-cols-12 items-center gap-2 p-2.5 rounded-2xl border transition-all select-none',
        set.completed
          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
          : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/20',
        className
      )}
    >
      <div className="col-span-2 flex items-center justify-center">
        <span className="w-6 h-6 rounded-full bg-white/10 text-white font-bold text-xs flex items-center justify-center">
          {set.setNumber}
        </span>
      </div>

      <div className="col-span-3 text-center">
        <span className="text-[11px] text-slate-400 font-semibold">{set.previousBest || '—'}</span>
      </div>

      <div className="col-span-3">
        <input
          type="number"
          value={set.weightKg}
          onChange={(e) => onUpdateSet('weightKg', e.target.value)}
          placeholder="kg"
          disabled={set.completed}
          className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2 text-center text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-75"
        />
      </div>

      <div className="col-span-2">
        <input
          type="number"
          value={set.reps}
          onChange={(e) => onUpdateSet('reps', e.target.value)}
          placeholder="reps"
          disabled={set.completed}
          className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2 text-center text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-75"
        />
      </div>

      <div className="col-span-2 flex justify-center">
        <button
          type="button"
          onClick={onToggleComplete}
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            set.completed
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-white/10'
          )}
          aria-label={`Mark set ${set.setNumber} complete`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
});

SetRow.displayName = 'SetRow';
