import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Check, Shield } from '../icons';

export interface QueueVisitor {
  id: string;
  name: string;
  scanTime: string;
  status: 'Valid' | 'Due Soon' | 'Expired';
}

export interface FrontDeskQueueProps {
  queue?: QueueVisitor[];
  onGrantEntry?: (id: string) => void;
  className?: string;
}

export const FrontDeskQueue: React.FC<FrontDeskQueueProps> = React.memo(({
  queue = [
    { id: 'q1', name: 'Lucas Torrez', scanTime: 'Just now', status: 'Valid' },
    { id: 'q2', name: 'Samantha Reed', scanTime: '30s ago', status: 'Due Soon' },
  ],
  onGrantEntry,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live Turnstile Verification Queue</span>
        </div>
        <Badge variant="success" size="sm">{queue.length} In Queue</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {queue.map((q) => (
          <div key={q.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{q.name}</span>
                <Badge variant={q.status === 'Valid' ? 'success' : 'warning'} size="sm">
                  {q.status}
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400">Scanned: {q.scanTime}</span>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Check className="w-3.5 h-3.5 stroke-[3]" />}
              onClick={() => onGrantEntry?.(q.id)}
            >
              Grant Turnstile Entry
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

FrontDeskQueue.displayName = 'FrontDeskQueue';
