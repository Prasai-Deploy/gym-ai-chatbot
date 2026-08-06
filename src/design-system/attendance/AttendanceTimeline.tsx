import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { CheckCircle2, LogOut } from '../icons';

export interface TimelineCheckEvent {
  id: string;
  type: 'In' | 'Out';
  memberName: string;
  time: string;
  gate: string;
}

export interface AttendanceTimelineProps {
  events?: TimelineCheckEvent[];
  className?: string;
}

export const AttendanceTimeline: React.FC<AttendanceTimelineProps> = React.memo(({
  events = [
    { id: '1', type: 'In', memberName: 'Marcus Vance', time: '08:30 AM', gate: 'Turnstile A (NFC)' },
    { id: '2', type: 'In', memberName: 'Sarah Jenkins', time: '08:45 AM', gate: 'Turnstile B (QR Pass)' },
    { id: '3', type: 'Out', memberName: 'David Miller', time: '09:10 AM', gate: 'Exit Turnstile C' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Check-in & Check-out Event Log</span>
        <Badge variant="neutral" size="sm">Real-Time</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {events.map((ev) => (
          <div key={ev.id} className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {ev.type === 'In' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <LogOut className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-white">{ev.memberName}</span>
                <span className="text-[10px] text-slate-400">{ev.gate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <Badge variant={ev.type === 'In' ? 'success' : 'warning'} size="sm">
                Gate {ev.type}
              </Badge>
              <span className="text-[10px] text-slate-400">{ev.time}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

AttendanceTimeline.displayName = 'AttendanceTimeline';
