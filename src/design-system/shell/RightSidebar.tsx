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
    <aside className={`w-80 shrink-0 hidden xl:flex flex-col gap-5 p-5 border-l border-white/[0.07] bg-[#090B10]/60 backdrop-blur-xl ${className}`}>
      {/* 1. Readiness / Energy Telemetry */}
      <Card variant="glass" className="flex flex-col items-center text-center p-4 gap-3 bg-[#11141D]/90 border-white/[0.07]">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">Daily Readiness</span>
          <Badge variant="success" size="sm">Optimal</Badge>
        </div>

        <ProgressRing value={84} size={96} strokeWidth={8} variant="primary" label="Readiness" />

        <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-white/[0.06] text-xs">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Burned</span>
            <span className="font-extrabold text-white font-display">1,850 kcal</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Training</span>
            <span className="font-extrabold text-orange-400 font-display">55 min</span>
          </div>
        </div>
      </Card>

      {/* 2. Trinity Recommendation */}
      <div className="p-4 rounded-xl bg-indigo-500/[0.05] border border-indigo-500/20 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white tracking-tight">Trinity AI Coach</span>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
            INSIGHT
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          "Recovery readiness is at 84%. Focus on explosive tempos for squats and maintain 180g protein goal."
        </p>
        <Button variant="premium" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />} onClick={onOpenCoach}>
          Consult Trinity
        </Button>
      </div>

      {/* 3. Upcoming Schedule */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            Upcoming Routine
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="p-3 rounded-xl bg-[#11141D] border border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <div className="flex flex-col">
                <span className="font-bold text-white tracking-tight">Lower Body Power</span>
                <span className="text-[10px] text-slate-400">Today • 5:30 PM</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#11141D]/50 border border-white/[0.04] flex items-center justify-between text-xs opacity-75">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-slate-500" />
              <div className="flex flex-col">
                <span className="font-bold text-slate-300 tracking-tight">Push & Core</span>
                <span className="text-[10px] text-slate-500">Tomorrow • 8:00 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
});

RightSidebar.displayName = 'RightSidebar';
