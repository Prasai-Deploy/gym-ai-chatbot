import React from 'react';
import { Drawer } from '../components/Drawer';
import { Badge } from '../components/Badge';
import { Flame, Bot, Award, CheckCircle2, Zap } from '../icons';

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
      title: 'AI Coach Plan Updated',
      message: 'Trinity AI generated your new hyper-trophy leg cycle for tomorrow.',
      time: '10m ago',
      unread: true,
    },
    {
      id: '2',
      type: 'workout',
      title: 'Workout Completed',
      message: 'Chest & Triceps session logged successfully. +450 kcal burned!',
      time: '2h ago',
      unread: true,
    },
    {
      id: '3',
      type: 'achievement',
      title: '7-Day Streak Unlocked!',
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
        return <Flame className="w-4 h-4 text-brand-400" />;
      case 'achievement':
        return <Award className="w-4 h-4 text-amber-400" />;
      default:
        return <Zap className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notification Center" side="right">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="text-xs text-slate-400 font-medium">Recent Activity</span>
          <Badge variant="primary" size="sm">
            {notifications.filter((n) => n.unread).length} Unread
          </Badge>
        </div>

        {notifications.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 select-none ${
              item.unread
                ? 'bg-slate-900 border-brand-500/30 shadow-md shadow-brand-500/5'
                : 'bg-slate-900/50 border-white/10 opacity-75'
            }`}
          >
            <div className="p-2 rounded-xl bg-white/5 shrink-0 mt-0.5">{getIcon(item.type)}</div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.title}</span>
                <span className="text-[10px] text-slate-500">{item.time}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
});

NotificationCenter.displayName = 'NotificationCenter';
