import React from 'react';
import { Users, CalendarCheck, UserCheck, Flame } from 'lucide-react';
import { OwnerOverviewMetrics } from '../hooks/useOwnerOverview';

interface OwnerStateSectionProps {
  metrics?: OwnerOverviewMetrics;
  isLoading?: boolean;
}

export const OwnerStateSection: React.FC<OwnerStateSectionProps> = ({ metrics, isLoading }) => {
  const cards = [
    {
      id: 'members',
      label: 'Enrolled Members',
      value: metrics?.totalMembers ?? 0,
      icon: <Users className="w-5 h-5 text-orange-400" />,
      subtext: 'Registered tenant members',
      accent: 'border-orange-500/20 bg-orange-500/[0.03]',
    },
    {
      id: 'today-checkins',
      label: "Today's Attendance",
      value: metrics?.todayCheckIns ?? 0,
      icon: <CalendarCheck className="w-5 h-5 text-emerald-400" />,
      subtext: 'Check-ins logged today',
      accent: 'border-emerald-500/20 bg-emerald-500/[0.03]',
    },
    {
      id: 'in-facility',
      label: 'Currently In Facility',
      value: metrics?.currentlyInFacility ?? 0,
      icon: <Flame className="w-5 h-5 text-amber-400" />,
      subtext: 'Active training sessions',
      accent: 'border-amber-500/20 bg-amber-500/[0.03]',
    },
    {
      id: 'active-staff',
      label: 'Active Staff Roster',
      value: metrics?.activeStaffCount ?? 0,
      icon: <UserCheck className="w-5 h-5 text-indigo-400" />,
      subtext: 'Managers, trainers & front desk',
      accent: 'border-indigo-500/20 bg-indigo-500/[0.03]',
    },
  ];

  return (
    <section aria-labelledby="state-heading" className="w-full">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 id="state-heading" className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
            Today's Gym Activity
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Key member counts and live floor attendance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`p-4 sm:p-5 rounded-2xl bg-[#0B0E14] border ${card.accent} transition-all relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 tracking-tight font-sans">
                {card.label}
              </span>
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                {card.icon}
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              {isLoading ? (
                <div className="h-8 w-16 bg-white/[0.08] rounded-lg animate-pulse" />
              ) : (
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                  {card.value.toLocaleString()}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 font-sans truncate">
              {card.subtext}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
