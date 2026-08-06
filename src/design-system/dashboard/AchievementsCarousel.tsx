import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Award, Flame, Zap, Shield, Sparkles } from '../icons';

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlockedAt: string;
}

export interface AchievementsCarouselProps {
  achievements?: AchievementItem[];
  className?: string;
}

export const AchievementsCarousel: React.FC<AchievementsCarouselProps> = React.memo(({
  achievements = [
    { id: '1', title: '7-Day Warrior', description: 'Logged 7 consecutive daily workouts.', icon: <Flame className="w-5 h-5 text-orange-400" />, unlockedAt: 'Today' },
    { id: '2', title: 'Centurion Lifter', description: 'Surpassed 100,000 kg total volume lifted.', icon: <Award className="w-5 h-5 text-amber-400" />, unlockedAt: 'Yesterday' },
    { id: '3', title: 'AI Optimized', description: 'Followed Trinity AI recommendations 10 times.', icon: <Sparkles className="w-5 h-5 text-indigo-400" />, unlockedAt: '3d ago' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Recent Achievements
        </span>
        <Badge variant="warning" size="sm">3 Unlocked</Badge>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
        {achievements.map((item) => (
          <div
            key={item.id}
            className="flex-1 min-w-[220px] p-4 rounded-2xl bg-slate-900 border border-white/10 flex flex-col gap-2 shrink-0 hover:border-amber-500/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-white/5">{item.icon}</div>
              <span className="text-[10px] text-slate-400 font-semibold">{item.unlockedAt}</span>
            </div>
            <span className="text-xs font-bold text-white tracking-tight">{item.title}</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
});

AchievementsCarousel.displayName = 'AchievementsCarousel';
