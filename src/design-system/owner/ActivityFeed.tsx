import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Activity, User, CheckCircle2 } from '../icons';

export interface GymEvent {
  id: string;
  type: string;
  detail: string;
  time: string;
}

export interface ActivityFeedProps {
  events?: GymEvent[];
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(({
  events = [
    { id: '1', type: 'Check-in', detail: 'Marcus Vance scanned NFC at Turnstile A', time: '2 mins ago' },
    { id: '2', type: 'Tier Upgrade', detail: 'Sarah Jenkins upgraded to Gold Pro Tier', time: '14 mins ago' },
    { id: '3', type: 'Class Booking', detail: '18 members signed up for 6:00 PM HIIT Blast', time: '35 mins ago' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Gym Floor Events Stream</span>
        </div>
        <Badge variant="neutral" size="sm">Real-Time</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {events.map((ev) => (
          <div key={ev.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-start gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{ev.type}</span>
                <span className="text-[10px] text-slate-500">{ev.time}</span>
              </div>
              <p className="text-slate-300">{ev.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

ActivityFeed.displayName = 'ActivityFeed';
