import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Activity, CheckCircle2 } from '../icons';

export interface ActivityItem {
  id: string;
  clientName: string;
  action: string;
  time: string;
}

export interface RecentActivityProps {
  activities?: ActivityItem[];
  className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = React.memo(({
  activities = [
    { id: '1', clientName: 'Marcus Vance', action: 'Completed Hypertrophy Chest & Triceps routine (12,450kg volume logged)', time: '10 mins ago' },
    { id: '2', clientName: 'Alexander Hayes', action: 'Logged Post-Workout Meal (52g protein target met)', time: '35 mins ago' },
    { id: '3', clientName: 'Sarah Jenkins', action: 'Updated weekly weight check-in (-0.5kg loss)', time: '1 hour ago' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live Member Activity Stream</span>
        </div>
        <Badge variant="neutral" size="sm">Real-Time</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {activities.map((act) => (
          <div key={act.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-start gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{act.clientName}</span>
                <span className="text-[10px] text-slate-500">{act.time}</span>
              </div>
              <p className="text-slate-300">{act.action}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

RecentActivity.displayName = 'RecentActivity';
