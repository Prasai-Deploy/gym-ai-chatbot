import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { VisitorCard, VisitorRecord } from './VisitorCard';

export interface CurrentVisitorsProps {
  visitors?: VisitorRecord[];
  onCheckOut?: (id: string) => void;
  onInspect?: (id: string) => void;
  className?: string;
}

export const CurrentVisitors: React.FC<CurrentVisitorsProps> = React.memo(({
  visitors = [
    { id: 'v1', name: 'Marcus Vance', planName: 'VIP Unlimited', checkInTime: '08:30 AM', status: 'Valid' },
    { id: 'v2', name: 'Sarah Jenkins', planName: 'Gold Pro Plan', checkInTime: '08:45 AM', status: 'Due Soon' },
    { id: 'v3', name: 'Alexander Hayes', planName: 'VIP Unlimited', checkInTime: '09:05 AM', status: 'Valid' },
    { id: 'v4', name: 'Samantha Reed', planName: 'Gold Pro Plan', checkInTime: '09:20 AM', status: 'Valid' },
  ],
  onCheckOut,
  onInspect,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Members Currently On Floor</span>
        <Badge variant="primary" size="sm">{visitors.length} Visitors Active</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visitors.map((v) => (
          <VisitorCard key={v.id} visitor={v} onCheckOut={onCheckOut} onInspect={onInspect} />
        ))}
      </div>
    </Card>
  );
});

CurrentVisitors.displayName = 'CurrentVisitors';
