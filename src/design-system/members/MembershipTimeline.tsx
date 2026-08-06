import React from 'react';
import { Card } from '../components/Card';

export interface TimelineMilestone {
  id: string;
  title: string;
  date: string;
}

export interface MembershipTimelineProps {
  milestones?: TimelineMilestone[];
  className?: string;
}

export const MembershipTimeline: React.FC<MembershipTimelineProps> = React.memo(({
  milestones = [
    { id: '1', title: 'Joined Gym (Standard Pass)', date: 'Jan 15, 2024' },
    { id: '2', title: 'Upgraded to Gold Pro Plan', date: 'Apr 01, 2024' },
    { id: '3', title: 'Added 1-on-1 PT Coaching Package', date: 'Jun 10, 2024' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Membership Journey Timeline</span>
      <div className="flex flex-col gap-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
        {milestones.map((m) => (
          <div key={m.id} className="relative flex items-center justify-between pl-7 text-xs">
            <div className="absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-400 border-2 border-slate-950" />
            <span className="font-bold text-white">{m.title}</span>
            <span className="text-[10px] text-slate-400 font-mono">{m.date}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

MembershipTimeline.displayName = 'MembershipTimeline';
