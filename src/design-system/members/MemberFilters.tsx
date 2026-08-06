import React from 'react';
import { Tabs, TabItem } from '../components/Tabs';

export interface MemberFiltersProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  className?: string;
}

export const MemberFilters: React.FC<MemberFiltersProps> = React.memo(({
  activeTab,
  onChangeTab,
  className,
}) => {
  const tabs: TabItem[] = [
    { id: 'all', label: 'All Members (1,240)' },
    { id: 'active', label: 'Active (1,180)' },
    { id: 'risk', label: 'At-Risk (14)', badge: '14' },
    { id: 'duesoon', label: 'Due Soon (28)' },
    { id: 'vip', label: 'VIP Tier (140)' },
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

MemberFilters.displayName = 'MemberFilters';
