import React from 'react';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { Badge } from '../components/Badge';

export interface GoalItem {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  variant?: 'primary' | 'ai' | 'success';
}

export interface GoalProgressProps {
  goals?: GoalItem[];
  className?: string;
}

export const GoalProgress: React.FC<GoalProgressProps> = React.memo(({
  goals = [
    { id: '1', name: 'Hit 105kg Bench Press', current: 102.5, target: 105, unit: 'kg', variant: 'primary' },
    { id: '2', name: 'Reach 14% Body Fat', current: 14.8, target: 14.0, unit: '%', variant: 'ai' },
    { id: '3', name: 'Log 20 Workouts This Month', current: 16, target: 20, unit: 'sessions', variant: 'success' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Fitness Goals</span>
        <Badge variant="primary" size="sm">{goals.length} Goals Tracked</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {goals.map((g) => (
          <MetricCard
            key={g.id}
            label={g.name}
            currentValue={g.current}
            targetValue={g.target}
            unit={g.unit}
            variant={g.variant}
          />
        ))}
      </div>
    </Card>
  );
});

GoalProgress.displayName = 'GoalProgress';
