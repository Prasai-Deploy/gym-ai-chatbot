import React from 'react';
import { Drawer } from '../components/Drawer';
import { Badge } from '../components/Badge';
import { Flame, Bot, Award, Zap, Bell } from '../icons';
import { cn } from '../tokens';

export interface NotificationItem {
  id: string;
  type: 'workout' | 'ai' | 'achievement' | 'system';
  title: string;
  message: string;
  time: string;
  unread?: boolean;
}

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = React.memo(({
  isOpen,
  onClose,
  notifications = [
    {
      id: '1',
      type: 'ai',
      title: 'Trinity Plan Updated',
      message: 'Trinity AI generated your new hypertrophy leg cycle for tomorrow.',
      time: '10m ago',
      unread: true,
    },
    {
      id: '2',
      type: 'workout',
      title: 'Session Logged',
      message: 'Chest & Triceps session logged successfully. +450 kcal burned!',
      time: '2h ago',
      unread: true,
    },
    {
      id: '3',
      type: 'achievement',
      title: '7-Day Streak Active',
      message: 'You hit your workout and diet goals 7 days in a row.',
      time: '1d ago',
      unread: false,
    },
  ],
}) => {
  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'ai':
        return <Bot className="w-4 h-4 text-indigo-400" />;
      case 'workout':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'achievement':
        return <Award className="w-4 h-4 text-amber-400" />;
      default:
        return <Zap className="w-4 h-4 text-emerald-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Telemetry & Alerts" side="right">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">Recent Activity</span>
          <Badge variant={unreadCount > 0 ? 'primary' : 'neutral'} size="sm">
            {unreadCount} Unread
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={cn(
                'p-3 rounded-xl border transition-all flex items-start gap-3 select-none',
                item.unread
                  ? 'bg-[#181C28] border-orange-500/25 shadow-sm shadow-orange-500/5'
                  : 'bg-[#11141D]/60 border-white/[0.05] opacity-80'
              )}
            >
              <div className="p-2 rounded-lg bg-white/[0.04] shrink-0 mt-0.5">{getIcon(item.type)}</div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">{item.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.time}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
});

NotificationCenter.displayName = 'NotificationCenter';
