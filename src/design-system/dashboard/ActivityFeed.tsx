import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Dumbbell, Flame, CheckCircle2, Bot } from '../icons';

export interface ActivityFeedItem {
  id: string;
  type: 'workout' | 'nutrition' | 'ai';
  title: string;
  detail: string;
  timestamp: string;
}

export interface ActivityFeedProps {
  activities?: ActivityFeedItem[];
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(({
  activities = [
    { id: '1', type: 'workout', title: 'Chest & Triceps Hypertrophy', detail: '6 Exercises • 18 Sets • 12,450 kg volume', timestamp: '2 hours ago' },
    { id: '2', type: 'ai', title: 'Trinity AI Plan Tuning', detail: 'Increased leg volume +10% based on recovery', timestamp: '5 hours ago' },
    { id: '3', type: 'nutrition', title: 'Macros Logged', detail: 'High protein lunch (65g protein, 750 kcal)', timestamp: '7 hours ago' },
  ],
  className,
}) => {
  const icons = {
    workout: <Flame className="w-4 h-4 text-brand-400" />,
    ai: <Bot className="w-4 h-4 text-indigo-400" />,
    nutrition: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Activity Log</span>
        <Badge variant="neutral" size="sm">Today</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {activities.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 shrink-0">{icons[item.type]}</div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{item.title}</span>
                <span className="text-[11px] text-slate-400">{item.detail}</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0 font-medium">{item.timestamp}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

ActivityFeed.displayName = 'ActivityFeed';
