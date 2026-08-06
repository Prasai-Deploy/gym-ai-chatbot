import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface MemberGoal {
  id: string;
  title: string;
  progressPct: number;
}

export interface GoalsPanelProps {
  goals?: MemberGoal[];
  className?: string;
}

export const GoalsPanel: React.FC<GoalsPanelProps> = React.memo(({
  goals = [
    { id: '1', title: 'Hit 105kg Bench Press 1RM', progressPct: 95 },
    { id: '2', title: 'Reduce Body Fat to 14%', progressPct: 80 },
    { id: '3', title: 'Complete 15 Workouts/Mo', progressPct: 100 },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Member Target Goals</span>
      <div className="flex flex-col gap-2">
        {goals.map((g) => (
          <div key={g.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{g.title}</span>
            <Badge variant={g.progressPct === 100 ? 'success' : 'primary'} size="sm">
              {g.progressPct}% Target
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

GoalsPanel.displayName = 'GoalsPanel';
