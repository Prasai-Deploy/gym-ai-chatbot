import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Calendar } from '../icons';

export interface CalendarDaySlot {
  dayName: string;
  dateNum: number;
  sessionCount: number;
  isToday?: boolean;
}

export interface TrainerCalendarProps {
  days?: CalendarDaySlot[];
  className?: string;
}

export const TrainerCalendar: React.FC<TrainerCalendarProps> = React.memo(({
  days = [
    { dayName: 'Mon', dateNum: 4, sessionCount: 5 },
    { dayName: 'Tue', dateNum: 5, sessionCount: 6 },
    { dayName: 'Wed', dateNum: 6, sessionCount: 5, isToday: true },
    { dayName: 'Thu', dateNum: 7, sessionCount: 4 },
    { dayName: 'Fri', dateNum: 8, sessionCount: 7 },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Weekly PT Session Schedule</span>
        </div>
        <Badge variant="primary" size="sm">27 Sessions This Week</Badge>
      </div>

      <div className="grid grid-cols-5 gap-2 pt-2">
        {days.map((d, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
              d.isToday
                ? 'bg-indigo-500/20 border-indigo-500 shadow-md shadow-indigo-500/20'
                : 'bg-slate-900 border-white/10'
            }`}
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase">{d.dayName}</span>
            <span className="text-lg font-black text-white">{d.dateNum}</span>
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              {d.sessionCount} PT
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
});

TrainerCalendar.displayName = 'TrainerCalendar';
