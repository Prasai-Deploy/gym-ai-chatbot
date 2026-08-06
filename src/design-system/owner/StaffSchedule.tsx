import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { User, Clock } from '../icons';

export interface ScheduleItem {
  id: string;
  trainerName: string;
  role: string;
  shiftTime: string;
  status: 'On Floor' | 'In PT Session' | 'Off Shift';
}

export interface StaffScheduleProps {
  schedule?: ScheduleItem[];
  className?: string;
}

export const StaffSchedule: React.FC<StaffScheduleProps> = React.memo(({
  schedule = [
    { id: '1', trainerName: 'Coach Elena Rostova', role: 'Head PT', shiftTime: '08:00 AM - 04:00 PM', status: 'In PT Session' },
    { id: '2', trainerName: 'Coach Brandon Vance', role: 'Strength Specialist', shiftTime: '10:00 AM - 06:00 PM', status: 'On Floor' },
    { id: '3', trainerName: 'Coach Maya Lin', role: 'HIIT & Recovery Lead', shiftTime: '01:00 PM - 09:00 PM', status: 'On Floor' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Trainer Floor Schedule</span>
        <Badge variant="neutral" size="sm">{schedule.length} Staff Shift</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {schedule.map((item) => (
          <div key={item.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{item.trainerName}</span>
                <span className="text-[10px] text-slate-400">{item.role} • {item.shiftTime}</span>
              </div>
            </div>

            <Badge variant={item.status === 'In PT Session' ? 'warning' : 'success'} size="sm">
              {item.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
});

StaffSchedule.displayName = 'StaffSchedule';
