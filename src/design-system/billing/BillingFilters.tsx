import React from 'react';
import { Tabs, TabItem } from '../components/Tabs';

export interface BillingFiltersProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  className?: string;
}

export const BillingFilters: React.FC<BillingFiltersProps> = React.memo(({
  activeTab,
  onChangeTab,
  className,
}) => {
  const tabs: TabItem[] = [
    { id: 'overview', label: 'Revenue Overview' },
    { id: 'invoices', label: 'Invoices & Ledger' },
    { id: 'dunning', label: 'Dunning & Recovery', badge: '3' },
    { id: 'pos', label: 'Front Desk POS' },
    { id: 'plans', label: 'Pricing Matrix' },
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

BillingFilters.displayName = 'BillingFilters';
