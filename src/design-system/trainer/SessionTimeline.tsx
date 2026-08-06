import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Clock, User } from '../icons';

export interface TimelineSession {
  id: string;
  time: string;
  client: string;
  focus: string;
  notes: string;
}

export interface SessionTimelineProps {
  timeline?: TimelineSession[];
  className?: string;
}

export const SessionTimeline: React.FC<SessionTimelineProps> = React.memo(({
  timeline = [
    { id: '1', time: '09:00 AM', client: 'Alexander Hayes', focus: 'Chest Hypertrophy', notes: 'Pushed to 102.5kg PR bench' },
    { id: '2', time: '11:00 AM', client: 'Marcus Vance', focus: 'Deadlift Technique', notes: 'Retracted scapula cues incorporated' },
    { id: '3', time: '02:00 PM', client: 'Sarah Jenkins', focus: 'Recomp Assessment', notes: 'Body fat reduced -0.5%' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Today's Coaching Session Timeline</span>
        <Badge variant="neutral" size="sm">{timeline.length} Logged</Badge>
      </div>

      <div className="flex flex-col gap-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
        {timeline.map((item) => (
          <div key={item.id} className="relative flex items-start gap-4 pl-8">
            <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-slate-950 shadow-sm shadow-indigo-400/50" />
            <div className="flex-1 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{item.client}</span>
                  <span className="text-[10px] text-indigo-400 font-mono font-semibold">{item.time}</span>
                </div>
                <span className="text-[11px] text-slate-300 font-semibold">{item.focus}</span>
                <span className="text-[10px] text-slate-400">{item.notes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

SessionTimeline.displayName = 'SessionTimeline';
