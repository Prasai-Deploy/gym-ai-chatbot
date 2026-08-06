import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Activity, CheckCircle2 } from '../icons';

export interface ActivityEvent {
  id: string;
  action: string;
  time: string;
}

export interface ActivityTimelineProps {
  events?: ActivityEvent[];
  className?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = React.memo(({
  events = [
    { id: '1', action: 'Scanned NFC at Turnstile A (Gym Floor Check-in)', time: 'Today 08:30 AM' },
    { id: '2', action: 'Completed Hypertrophy Chest & Triceps Workout', time: 'Today 09:45 AM' },
    { id: '3', action: 'Logged Post-Workout Salmon & Sweet Potato Meal', time: 'Today 01:15 PM' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          Member Customer Activity Stream
        </span>
        <Badge variant="neutral" size="sm">Real-Time</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {events.map((ev) => (
          <div key={ev.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-white">{ev.action}</span>
              <span className="text-[10px] text-slate-500">{ev.time}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

ActivityTimeline.displayName = 'ActivityTimeline';
