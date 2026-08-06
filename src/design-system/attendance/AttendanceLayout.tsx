import React, { useState } from 'react';
import { AttendanceHero } from './AttendanceHero';
import { LiveOccupancy } from './LiveOccupancy';
import { CurrentVisitors } from './CurrentVisitors';
import { CheckInPanel } from './CheckInPanel';
import { CheckOutPanel } from './CheckOutPanel';
import { ScannerPanel } from './ScannerPanel';
import { FrontDeskQueue } from './FrontDeskQueue';
import { VisitorSearch } from './VisitorSearch';
import { AttendanceFilters } from './AttendanceFilters';
import { AttendanceTimeline } from './AttendanceTimeline';
import { OccupancyChart } from './OccupancyChart';
import { PeakHours } from './PeakHours';
import { GuestPass } from './GuestPass';
import { AIAttendanceInsights } from './AIAttendanceInsights';
import { AccessLogs } from './AccessLogs';
import { SecurityAlerts } from './SecurityAlerts';
import { EmergencyRollCall } from './EmergencyRollCall';
import { VisitorProfileDrawer } from './VisitorProfileDrawer';
import { PageContainer } from '../shell/PageContainer';
import { cn } from '../tokens';

export interface AttendanceLayoutProps {
  className?: string;
}

export const AttendanceLayout: React.FC<AttendanceLayoutProps> = React.memo(({
  className,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [activeTab, setActiveTab] = useState('floor');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Hero Banner */}
      <AttendanceHero occupancyCount={142} maxCapacity={200} totalCheckinsToday={680} />

      {/* 2. Emergency Roll Call Protocol */}
      <EmergencyRollCall occupantsCount={142} />

      {/* 3. Live Floor Occupancy & Front Desk Check-in Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveOccupancy currentCount={142} maxCapacity={200} />
        <CheckInPanel onManualCheckIn={(q) => console.log('Check-in query:', q)} />
      </div>

      {/* 4. Hardware Scanner Suite */}
      <ScannerPanel onScanResult={(res) => console.log('Scan result:', res)} />

      {/* 5. Live Turnstile Queue & Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FrontDeskQueue />
        <SecurityAlerts onInspectAlert={() => setIsDrawerOpen(true)} />
      </div>

      {/* 6. Visitor Roster Search & Filter Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <VisitorSearch value={searchVal} onChange={setSearchVal} className="w-full sm:max-w-md" />
        <AttendanceFilters activeTab={activeTab} onChangeTab={setActiveTab} />
      </div>

      {/* 7. Members Currently On Floor Grid */}
      <CurrentVisitors onInspect={() => setIsDrawerOpen(true)} />

      {/* 8. AI Front Desk Flow Advisor & Guest Pass Issuer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIAttendanceInsights />
        <GuestPass />
      </div>

      {/* 9. Occupancy Chart & Peak Hours Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OccupancyChart className="lg:col-span-2" />
        <PeakHours />
      </div>

      {/* 10. Check-in Timeline Stream & Turnstile Access Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceTimeline />
        <AccessLogs />
      </div>

      {/* 11. End of Day Checkout Operations */}
      <CheckOutPanel onCheckOutAll={() => console.log('Checkout all occupants')} />

      {/* 12. Visitor Profile Verification Drawer */}
      <VisitorProfileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </PageContainer>
  );
});

AttendanceLayout.displayName = 'AttendanceLayout';
