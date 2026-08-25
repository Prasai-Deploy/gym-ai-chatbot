import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProgressRing } from '../components/ProgressRing';
import { Button } from '../components/Button';
import { Bot, Flame, Calendar, Sparkles } from '../icons';

export interface RightSidebarProps {
  onOpenCoach?: () => void;
  className?: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = React.memo(({
  onOpenCoach,
  className,
}) => {
  return (
    <aside className={`glass-nav w-80 shrink-0 hidden xl:flex flex-col gap-5 p-4 m-3 ml-0 rounded-[28px] h-[calc(100vh-1.5rem)] sticky top-3 overflow-y-auto no-scrollbar ${className}`}>
      {/* Daily Progress Widget */}
      <Card variant="glass" className="flex flex-col items-center text-center p-5 gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Today's Energy</span>
          <Badge variant="primary" size="sm">Active</Badge>
        </div>

        <ProgressRing value={75} size={110} strokeWidth={10} variant="primary" label="Daily Target" />

        <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-white/10 text-xs">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400">Calories</span>
            <span className="font-bold text-white">1,850 kcal</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400">Workout</span>
            <span className="font-bold text-brand-400">55 min</span>
          </div>
        </div>
      </Card>

      {/* AI Assistant Quick Card */}
      <Card variant="coach" className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white">Trinity AI Coach</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Ready for your lower-body session? Keep the first working set controlled and leave one rep in reserve.
        </p>
        <Button variant="premium" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />} onClick={onOpenCoach}>
          Chat with AI
        </Button>
      </Card>

      {/* Upcoming Schedule */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-500" />
            Schedule
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-brand-400" />
              <div className="flex flex-col">
                <span className="font-bold text-white">Lower Body Power</span>
                <span className="text-[10px] text-slate-400">Today • 5:30 PM</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs opacity-75">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-slate-500" />
              <div className="flex flex-col">
                <span className="font-bold text-white">Push & Abs</span>
                <span className="text-[10px] text-slate-400">Tomorrow • 8:00 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
});

RightSidebar.displayName = 'RightSidebar';
