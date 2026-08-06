import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Award } from '../icons';

export interface MemberBadge {
  id: string;
  title: string;
  unlockedDate: string;
}

export interface AchievementsPanelProps {
  badges?: MemberBadge[];
  className?: string;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = React.memo(({
  badges = [
    { id: '1', title: '100kg Bench Press Master', unlockedDate: 'Jul 28' },
    { id: '2', title: '7-Day Streak Warrior', unlockedDate: 'Jul 24' },
    { id: '3', title: '50 Workouts Club', unlockedDate: 'Jun 15' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Member Trophies & Badges
        </span>
        <Badge variant="warning" size="sm">{badges.length} Trophies</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div key={b.id} className="p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white">{b.title}</span>
            <span className="text-[10px] text-amber-300">({b.unlockedDate})</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

AchievementsPanel.displayName = 'AchievementsPanel';
