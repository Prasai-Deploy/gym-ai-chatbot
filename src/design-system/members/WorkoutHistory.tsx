import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Dumbbell } from '../icons';

export interface WorkoutLogEntry {
  id: string;
  title: string;
  volumeKg: number;
  date: string;
}

export interface WorkoutHistoryProps {
  logs?: WorkoutLogEntry[];
  className?: string;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = React.memo(({
  logs = [
    { id: '1', title: 'Hypertrophy Chest & Triceps Blast', volumeKg: 12450, date: 'Today' },
    { id: '2', title: 'Back & Biceps Heavy Density', volumeKg: 14800, date: 'Jul 30' },
    { id: '3', title: 'Quads & Calves Quad Focus', volumeKg: 16200, date: 'Jul 28' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-brand-400" />
          Completed Workouts
        </span>
        <Badge variant="primary" size="sm">{logs.length} Logged</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {logs.map((l) => (
          <div key={l.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{l.title}</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-brand-400 font-bold">{l.volumeKg.toLocaleString()} kg</span>
              <span className="text-slate-500 text-[10px]">{l.date}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

WorkoutHistory.displayName = 'WorkoutHistory';
