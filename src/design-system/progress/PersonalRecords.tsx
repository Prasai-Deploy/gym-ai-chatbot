import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Award, Dumbbell } from '../icons';

export interface RecordItem {
  id: string;
  exercise: string;
  weightKg: number;
  reps: number;
  date: string;
}

export interface PersonalRecordsProps {
  records?: RecordItem[];
  className?: string;
}

export const PersonalRecords: React.FC<PersonalRecordsProps> = React.memo(({
  records = [
    { id: '1', exercise: 'Incline Barbell Bench Press', weightKg: 102.5, reps: 5, date: 'Jul 28' },
    { id: '2', exercise: 'Barbell Back Squat', weightKg: 135, reps: 5, date: 'Jul 24' },
    { id: '3', exercise: 'Conventional Deadlift', weightKg: 170, reps: 3, date: 'Jul 18' },
    { id: '4', exercise: 'Standing Overhead Press', weightKg: 62.5, reps: 6, date: 'Jul 12' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">All-Time Personal Records (PRs)</span>
        </div>
        <Badge variant="warning" size="sm">{records.length} Hall of Fame PRs</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {records.map((rec) => (
          <div key={rec.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{rec.exercise}</span>
                <span className="text-[10px] text-slate-400">{rec.date}</span>
              </div>
            </div>

            <div className="flex flex-col text-right font-mono">
              <span className="text-sm font-black text-amber-400">{rec.weightKg} kg</span>
              <span className="text-[10px] text-slate-400 font-semibold">{rec.reps} reps</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

PersonalRecords.displayName = 'PersonalRecords';
