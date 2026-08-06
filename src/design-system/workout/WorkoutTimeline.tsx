import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { CheckCircle2, Dumbbell } from '../icons';

export interface TimelineSetEntry {
  exerciseName: string;
  setNumber: number;
  weightKg: number | string;
  reps: number | string;
  time: string;
}

export interface WorkoutTimelineProps {
  entries: TimelineSetEntry[];
  className?: string;
}

export const WorkoutTimeline: React.FC<WorkoutTimelineProps> = React.memo(({
  entries,
  className,
}) => {
  return (
    <Card variant="default" className={`p-5 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-orange-400" />
          Completed Sets Log
        </span>
        <Badge variant="neutral" size="sm">{entries.length} Sets Logged</Badge>
      </div>

      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
        {entries.map((entry, idx) => (
          <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white">{entry.exerciseName}</span>
              <span className="text-slate-400 text-[11px]">Set {entry.setNumber}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-orange-400">{entry.weightKg} kg × {entry.reps}</span>
              <span className="text-[10px] text-slate-500">{entry.time}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

WorkoutTimeline.displayName = 'WorkoutTimeline';
