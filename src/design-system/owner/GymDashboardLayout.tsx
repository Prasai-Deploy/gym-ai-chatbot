import React, { useState } from 'react';
import { BusinessHero } from './BusinessHero';
import { BusinessHealth } from './BusinessHealth';
import { RevenueCard } from './RevenueCard';
import { MembershipCard } from './MembershipCard';
import { AttendanceCard } from './AttendanceCard';
import { TrainerCard } from './TrainerCard';
import { RenewalAlerts } from './RenewalAlerts';
import { AIBusinessInsights } from './AIBusinessInsights';
import { TodaysTasks } from './TodaysTasks';
import { QuickActions } from './QuickActions';
import { RevenueChart } from './RevenueChart';
import { AttendanceHeatmap } from './AttendanceHeatmap';
import { MembershipGrowth } from './MembershipGrowth';
import { StaffSchedule } from './StaffSchedule';
import { TopTrainers } from './TopTrainers';
import { RecentPayments } from './RecentPayments';
import { ActivityFeed } from './ActivityFeed';
import { BusinessMetrics } from './BusinessMetrics';
import { OwnerSidebar } from './OwnerSidebar';
import { PageContainer } from '../shell/PageContainer';
import { IconButton } from '../components/IconButton';
import { Building } from '../icons';
import { cn } from '../tokens';

export interface GymDashboardLayoutProps {
  facilityName?: string;
  className?: string;
}

export const GymDashboardLayout: React.FC<GymDashboardLayoutProps> = React.memo(({
  facilityName = 'STRIVA Metro Flagship',
  className,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Facility Switcher Trigger & Hero Banner */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <BusinessHero facilityName={facilityName} monthlyRevenueMrr={48250} activeMembers={1240} occupancyCount={142} />
        </div>
        <IconButton
          icon={<Building className="w-5 h-5 text-amber-400" />}
          aria-label="Switch Facility"
          size="lg"
          variant="secondary"
          onClick={() => setIsSidebarOpen(true)}
        />
      </div>

      {/* 2. Quick Actions Bar */}
      <QuickActions />

      {/* 3. Business Health Index & Live Floor Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BusinessHealth className="lg:col-span-2" />
        <AttendanceCard currentOccupancy={142} maxCapacity={200} totalCheckinsToday={680} />
      </div>

      {/* 4. Revenue MRR & Membership Stats */}
      <RevenueCard monthlyRevenueMrr={48250} arpuAmount={125} grossAnnualArr={579000} />
      <MembershipCard totalMembers={1240} newThisMonth={48} churnRatePct={1.4} />

      {/* 5. Revenue Growth Chart & AI Business Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart className="lg:col-span-2" />
        <AIBusinessInsights />
      </div>

      {/* 6. Gym Floor Check-in Heatmap & Acquisition vs Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AttendanceHeatmap className="lg:col-span-2" />
        <MembershipGrowth />
      </div>

      {/* 7. Trainer Load & Renewal Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrainerCard />
        <RenewalAlerts className="lg:col-span-2" />
      </div>

      {/* 8. Staff Schedule & Top Trainers Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaffSchedule />
        <TopTrainers />
      </div>

      {/* 9. SaaS KPIs, Recent Payments & Events Feed */}
      <BusinessMetrics cacAmount={45} ltvAmount={1850} retentionRatePct={96.2} npsScore={78} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentPayments className="lg:col-span-2" />
        <ActivityFeed />
      </div>

      {/* 10. Owner Daily Action Checklist */}
      <TodaysTasks />

      {/* 11. Facility Switcher Drawer */}
      <OwnerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </PageContainer>
  );
});

GymDashboardLayout.displayName = 'GymDashboardLayout';
