import React from 'react';
import { AlertCircle, Users, Dumbbell, Activity, ArrowRight } from '../icons';
import { cn } from '../tokens';

export interface OwnerActionItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeVariant?: 'warning' | 'primary' | 'success';
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export interface OwnerActionHighlightsProps {
  items?: OwnerActionItem[];
  onNavigateMembers?: () => void;
  onNavigateTrainers?: () => void;
  onNavigateAttendance?: () => void;
  className?: string;
}

export const OwnerActionHighlights: React.FC<OwnerActionHighlightsProps> = React.memo(({
  items,
  onNavigateMembers,
  onNavigateTrainers,
  onNavigateAttendance,
  className,
}) => {
  const defaultItems: OwnerActionItem[] = [
    {
      id: 'a1',
      title: '8 Membership Renewals Expiring',
      description: 'Total value: $1,240 MRR. Automated reminder sequence active.',
      badge: 'Action Needed',
      badgeVariant: 'warning',
      actionLabel: 'View Members',
      onAction: onNavigateMembers,
      icon: <Users className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'a2',
      title: 'Trainer Load Alert (Coach Elena & Marcus)',
      description: 'Both trainers at 95% client roster capacity. Recommend onboarding PT.',
      badge: 'Capacity 95%',
      badgeVariant: 'primary',
      actionLabel: 'Manage Trainers',
      onAction: onNavigateTrainers,
      icon: <Dumbbell className="w-3.5 h-3.5 text-orange-400" />,
    },
    {
      id: 'a3',
      title: 'Peak Evening Floor Capacity Forecast',
      description: 'Predicted 185 / 200 occupancy between 6:00 PM – 8:00 PM.',
      badge: 'Peak 6:30 PM',
      badgeVariant: 'success',
      actionLabel: 'View Access Logs',
      onAction: onNavigateAttendance,
      icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />,
    },
  ];

  const displayItems = items || defaultItems;

  return (
    <div className={cn('w-full flex flex-col gap-3 select-none', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans">
          Operational Attention Required
        </h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {displayItems.map((item) => (
          <div
            key={item.id}
            onClick={item.onAction}
            className="p-3.5 sm:p-4 rounded-xl bg-[#11141D] border border-white/[0.06] hover:border-orange-500/30 flex items-center justify-between gap-4 transition-all duration-200 cursor-pointer group shadow-sm"
          >
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0 mt-0.5">
                {item.icon || <AlertCircle className="w-3.5 h-3.5 text-orange-400" />}
              </div>

              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight truncate">
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      item.badgeVariant === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : item.badgeVariant === 'primary'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    )}
                  >
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-orange-400 shrink-0 transition-colors">
              <span className="hidden sm:inline">{item.actionLabel || 'View Details'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

OwnerActionHighlights.displayName = 'OwnerActionHighlights';
