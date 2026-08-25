import React from 'react';
import { MinimalOwnerHero } from './MinimalOwnerHero';
import { OwnerTrendChart } from './OwnerTrendChart';
import { OwnerActionHighlights } from './OwnerActionHighlights';
import { OwnerTrinityAdvisor } from './OwnerTrinityAdvisor';
import { SecondaryBusinessDetails } from './SecondaryBusinessDetails';
import { useOwnerData } from '../../hooks/useStrivaApi';
import { cn } from '../tokens';

export interface GymDashboardLayoutProps {
  facilityName?: string;
  onNavigateMembers?: () => void;
  onNavigateTrainers?: () => void;
  onNavigateAttendance?: () => void;
  onNavigateBilling?: () => void;
  onNavigateCoach?: () => void;
  className?: string;
}

export const GymDashboardLayout: React.FC<GymDashboardLayoutProps> = React.memo(({
  facilityName = 'STRIVA Metro Flagship',
  onNavigateMembers = () => console.log('Navigate members'),
  onNavigateTrainers = () => console.log('Navigate trainers'),
  onNavigateAttendance = () => console.log('Navigate attendance'),
  onNavigateBilling = () => console.log('Navigate billing'),
  onNavigateCoach = () => console.log('Navigate coach'),
  className,
}) => {
  const { data: ownerData } = useOwnerData();

  const mrr = ownerData?.mrr || 48250;
  const activeMembers = ownerData?.activeMembers || 1240;
  const todayAttendance = ownerData?.todayAttendance || 680;
  const activeTrainers = ownerData?.activeTrainers || 12;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 select-none', className)}>
      {/* 1. Header Identity */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          {formattedDate}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          Executive Facility Dashboard
        </h1>
      </div>

      {/* 2. Primary Business Health Hero */}
      <MinimalOwnerHero
        facilityName={facilityName}
        monthlyRevenueMrr={mrr}
        activeMembers={activeMembers}
        todayCheckins={todayAttendance}
        activeTrainers={activeTrainers}
        statusHeadline="Facility operations are performing 12% above monthly target."
      />

      {/* 3. Operational 12-Week Trendline */}
      <OwnerTrendChart />

      {/* 4. Priority Operational Attention */}
      <OwnerActionHighlights
        onNavigateMembers={onNavigateMembers}
        onNavigateTrainers={onNavigateTrainers}
        onNavigateAttendance={onNavigateAttendance}
      />

      {/* 5. Quiet Trinity Business Advisor */}
      <OwnerTrinityAdvisor
        insightText="Member retention is at 96.2%. Re-engaging the 14 at-risk members before Friday will secure $1,750 in recurring revenue."
        onAction={onNavigateCoach}
      />

      {/* 6. Financial Health & Executive Details */}
      <SecondaryBusinessDetails
        arpuAmount={125}
        grossAnnualArr={mrr * 12}
        onAddMember={onNavigateMembers}
        onViewBilling={onNavigateBilling}
      />
    </div>
  );
});

GymDashboardLayout.displayName = 'GymDashboardLayout';
