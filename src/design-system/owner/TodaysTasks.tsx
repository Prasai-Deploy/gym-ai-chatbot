import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Check } from '../icons';

export interface OwnerTask {
  id: string;
  title: string;
  category: 'Operations' | 'Staffing' | 'Finance';
  completed: boolean;
}

export interface TodaysTasksProps {
  initialTasks?: OwnerTask[];
  className?: string;
}

export const TodaysTasks: React.FC<TodaysTasksProps> = React.memo(({
  initialTasks = [
    { id: '1', title: 'Approve August Trainer PT Payroll', category: 'Finance', completed: true },
    { id: '2', title: 'Review HVAC maintenance report for Zone B', category: 'Operations', completed: false },
    { id: '3', title: 'Confirm 3 new trainer hiring interviews', category: 'Staffing', completed: false },
  ],
  className,
}) => {
  const [tasks, setTasks] = useState<OwnerTask[]>(initialTasks);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Owner Action Checklist</span>
        <Badge variant="neutral" size="sm">{tasks.filter((t) => t.completed).length} / {tasks.length} Done</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
              task.completed ? 'bg-slate-950/40 border-white/5 opacity-60' : 'bg-slate-900 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                task.completed ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-slate-800 border-white/20'
              }`}>
                {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                {task.title}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{task.category}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

TodaysTasks.displayName = 'TodaysTasks';
