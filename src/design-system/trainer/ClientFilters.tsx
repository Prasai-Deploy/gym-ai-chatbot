import React from 'react';
import { Tabs, TabItem } from '../components/Tabs';

export interface ClientFiltersProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  className?: string;
}

export const ClientFilters: React.FC<ClientFiltersProps> = React.memo(({
  activeTab,
  onChangeTab,
  className,
}) => {
  const tabs: TabItem[] = [
    { id: 'all', label: 'All Clients (24)' },
    { id: 'attention', label: 'Needs Attention (3)', badge: '3' },
    { id: 'high', label: 'High Adherence' },
    { id: 'inactive', label: 'Inactive' },
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

ClientFilters.displayName = 'ClientFilters';
