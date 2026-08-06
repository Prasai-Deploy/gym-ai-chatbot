import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Award, Flame, Zap } from '../icons';

export interface MilestoneItem {
  id: string;
  title: string;
  detail: string;
  date: string;
  badgeType: 'primary' | 'warning' | 'ai' | 'success';
}

export interface AchievementsTimelineProps {
  milestones?: MilestoneItem[];
  className?: string;
}

export const AchievementsTimeline: React.FC<AchievementsTimelineProps> = React.memo(({
  milestones = [
    { id: '1', title: 'Unlocked 100kg Bench Press Milestone', detail: 'Lifted 102.5kg for 5 reps', date: 'Jul 28', badgeType: 'warning' },
    { id: '2', title: 'Achieved 7-Day Consistency Streak', detail: 'Completed 7 sessions without missing a day', date: 'Jul 24', badgeType: 'primary' },
    { id: '3', title: 'Logged 100 Total Workouts', detail: 'Reached Century Lifter status', date: 'Jul 15', badgeType: 'success' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Trophy & Milestone Timeline</span>
        <Badge variant="warning" size="sm">{milestones.length} Unlocked</Badge>
      </div>

      <div className="flex flex-col gap-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
        {milestones.map((m) => (
          <div key={m.id} className="relative flex items-start gap-4 pl-8">
            <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 shadow-sm shadow-amber-400/50" />
            <div className="flex-1 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{m.title}</span>
                <span className="text-[11px] text-slate-400">{m.detail}</span>
              </div>
              <Badge variant={m.badgeType} size="sm">{m.date}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

AchievementsTimeline.displayName = 'AchievementsTimeline';
