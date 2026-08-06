import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Clock, User, CheckCircle2 } from '../icons';

export interface PTSession {
  id: string;
  timeSlot: string;
  clientName: string;
  sessionType: string;
  status: 'Upcoming' | 'In Progress' | 'Completed';
}

export interface TodaysSessionsProps {
  sessions?: PTSession[];
  className?: string;
}

export const TodaysSessions: React.FC<TodaysSessionsProps> = React.memo(({
  sessions = [
    { id: '1', timeSlot: '09:00 AM - 10:00 AM', clientName: 'Alexander Hayes', sessionType: '1-on-1 Hypertrophy Push', status: 'Completed' },
    { id: '2', timeSlot: '11:00 AM - 12:00 PM', clientName: 'Marcus Vance', sessionType: '1-on-1 Deadlift & Back Form Check', status: 'In Progress' },
    { id: '3', timeSlot: '02:00 PM - 03:00 PM', clientName: 'Sarah Jenkins', sessionType: '1-on-1 Recomp Deload Assessment', status: 'Upcoming' },
    { id: '4', timeSlot: '04:30 PM - 05:30 PM', clientName: 'David Miller', sessionType: '1-on-1 Conditioning & Core', status: 'Upcoming' },
  ],
  className,
}) => {
  return (
    <Card variant="workout" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Today's 1-on-1 PT Schedule</span>
        </div>
        <Badge variant="primary" size="sm">{sessions.length} Sessions Today</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              s.status === 'In Progress'
                ? 'bg-indigo-500/15 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                : s.status === 'Completed'
                ? 'bg-slate-900/50 border-white/5 opacity-75'
                : 'bg-slate-900 border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-xs">
                {s.status === 'Completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <User className="w-4 h-4 text-indigo-400" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{s.clientName}</span>
                <span className="text-[10px] text-slate-400">{s.sessionType} • <span className="font-mono text-indigo-300 font-semibold">{s.timeSlot}</span></span>
              </div>
            </div>

            <Badge variant={s.status === 'In Progress' ? 'warning' : s.status === 'Completed' ? 'success' : 'neutral'} size="sm">
              {s.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

TodaysSessions.displayName = 'TodaysSessions';
