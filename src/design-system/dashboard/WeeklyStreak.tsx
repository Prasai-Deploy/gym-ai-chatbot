import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Flame, Check } from '../icons';

export interface DayStreak {
  day: string; // Mon, Tue, etc.
  date: number;
  completed: boolean;
  isToday?: boolean;
}

export interface WeeklyStreakProps {
  days?: DayStreak[];
  streakCount?: number;
  className?: string;
}

export const WeeklyStreak: React.FC<WeeklyStreakProps> = React.memo(({
  days = [
    { day: 'Mon', date: 1, completed: true },
    { day: 'Tue', date: 2, completed: true },
    { day: 'Wed', date: 3, completed: true },
    { day: 'Thu', date: 4, completed: true },
    { day: 'Fri', date: 5, completed: true },
    { day: 'Sat', date: 6, completed: true, isToday: true },
    { day: 'Sun', date: 7, completed: false },
  ],
  streakCount = 7,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Consistency Streak</span>
        </div>
        <Badge variant="primary" size="sm">
          {streakCount} Days Active
        </Badge>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {days.map((item, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
              item.isToday
                ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                : item.completed
                ? 'bg-slate-900 border-white/10 text-white'
                : 'bg-slate-950/40 border-white/5 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase">{item.day}</span>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                item.completed ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {item.completed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : item.date}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

WeeklyStreak.displayName = 'WeeklyStreak';
