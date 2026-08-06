import React from 'react';
import { Tabs, TabItem } from '../components/Tabs';

export interface AttendanceFiltersProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  className?: string;
}

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = React.memo(({
  activeTab,
  onChangeTab,
  className,
}) => {
  const tabs: TabItem[] = [
    { id: 'floor', label: 'On Floor Now (142)' },
    { id: 'today', label: 'All Today (680)' },
    { id: 'alerts', label: 'Security Alerts (2)', badge: '2' },
    { id: 'guests', label: 'Guest Passes (8)' },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={onChangeTab}
      variant="pill"
      className={className}
    />
  );
});

AttendanceFilters.displayName = 'AttendanceFilters';
