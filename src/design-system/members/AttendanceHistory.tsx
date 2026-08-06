import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Activity } from '../icons';

export interface AttendanceEntry {
  id: string;
  time: string;
  gate: string;
}

export interface AttendanceHistoryProps {
  entries?: AttendanceEntry[];
  className?: string;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = React.memo(({
  entries = [
    { id: '1', time: 'Today 08:30 AM', gate: 'Main Entrance Turnstile A' },
    { id: '2', time: 'Yesterday 05:45 PM', gate: 'Main Entrance Turnstile B' },
    { id: '3', time: 'Jul 30 08:15 AM', gate: 'VIP Locker Room Gate' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Check-in Log History
        </span>
        <Badge variant="neutral" size="sm">{entries.length} Check-ins</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {entries.map((e) => (
          <div key={e.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{e.time}</span>
            <span className="text-slate-400 text-[11px]">{e.gate}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

AttendanceHistory.displayName = 'AttendanceHistory';
