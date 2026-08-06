import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Dumbbell, Plus } from '../icons';

export interface AssignedWorkout {
  id: string;
  clientName: string;
  routineTitle: string;
  durationWeeks: number;
  assignedDate: string;
}

export interface WorkoutAssignmentsProps {
  assignments?: AssignedWorkout[];
  onAssignNew?: () => void;
  className?: string;
}

export const WorkoutAssignments: React.FC<WorkoutAssignmentsProps> = React.memo(({
  assignments = [
    { id: '1', clientName: 'Marcus Vance', routineTitle: 'Hypertrophy Push & Pull 4-Day Split', durationWeeks: 8, assignedDate: 'Aug 01' },
    { id: '2', clientName: 'Sarah Jenkins', routineTitle: 'Glute & Hamstring Recomp Cycle', durationWeeks: 6, assignedDate: 'Jul 28' },
    { id: '3', clientName: 'David Miller', routineTitle: '5x5 Strength Foundation', durationWeeks: 12, assignedDate: 'Jul 20' },
  ],
  onAssignNew,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-orange-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Assigned Workout Routines</span>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5 text-orange-400" />} onClick={onAssignNew}>
          Assign Workout
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {assignments.map((as) => (
          <div key={as.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">{as.clientName}</span>
              <span className="text-[10px] text-slate-400">{as.routineTitle} • {as.durationWeeks} Weeks</span>
            </div>
            <Badge variant="primary" size="sm">Assigned {as.assignedDate}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

WorkoutAssignments.displayName = 'WorkoutAssignments';
