import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface GateLog {
  id: string;
  user: string;
  gate: string;
  result: 'Granted' | 'Denied';
  time: string;
}

export interface AccessLogsProps {
  logs?: GateLog[];
  className?: string;
}

export const AccessLogs: React.FC<AccessLogsProps> = React.memo(({
  logs = [
    { id: '1', user: 'Marcus Vance', gate: 'Turnstile A (NFC)', result: 'Granted', time: '2 mins ago' },
    { id: '2', user: 'Unknown Tag ID (9921)', gate: 'Turnstile B (RFID)', result: 'Denied', time: '14 mins ago' },
    { id: '3', user: 'Sarah Jenkins', gate: 'Turnstile A (QR Pass)', result: 'Granted', time: '22 mins ago' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Gate Access Control Logs</span>
        <Badge variant="neutral" size="sm">System Stream</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {logs.map((l) => (
          <div key={l.id} className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-white">{l.user}</span>
              <span className="text-[10px] text-slate-400">{l.gate} • {l.time}</span>
            </div>
            <Badge variant={l.result === 'Granted' ? 'success' : 'danger'} size="sm">
              {l.result}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

AccessLogs.displayName = 'AccessLogs';
