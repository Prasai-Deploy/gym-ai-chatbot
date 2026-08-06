import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Calendar, Flame, CheckCircle2 } from '../icons';

export interface ScheduleEvent {
  id: string;
  time: string;
  title: string;
  trainer?: string;
  type: 'workout' | 'nutrition' | 'recovery';
  status: 'upcoming' | 'completed' | 'in-progress';
}

export interface ScheduleTimelineProps {
  events?: ScheduleEvent[];
  className?: string;
}

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = React.memo(({
  events = [
    { id: '1', time: '08:00 AM', title: 'Hydration & Pre-Workout Meal', type: 'nutrition', status: 'completed' },
    { id: '2', time: '05:30 PM', title: 'Hypertrophy Chest & Triceps Blast', trainer: 'Coach Trinity AI', type: 'workout', status: 'in-progress' },
    { id: '3', time: '08:30 PM', title: 'Post-Workout Anabolic Meal & Mobility Work', type: 'recovery', status: 'upcoming' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-400" />
          Today's Schedule
        </span>
        <Badge variant="neutral" size="sm">3 Tasks</Badge>
      </div>

      <div className="flex flex-col gap-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
        {events.map((ev) => (
          <div key={ev.id} className="relative flex items-start gap-4 pl-8">
            <div
              className={`absolute left-2 top-1.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                ev.status === 'completed'
                  ? 'bg-emerald-500'
                  : ev.status === 'in-progress'
                  ? 'bg-orange-500 ring-4 ring-orange-500/20'
                  : 'bg-slate-600'
              }`}
            />
            <div className="flex-1 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{ev.title}</span>
                {ev.trainer && <span className="text-[10px] text-indigo-400 font-semibold">{ev.trainer}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-400">{ev.time}</span>
                {ev.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

ScheduleTimeline.displayName = 'ScheduleTimeline';
