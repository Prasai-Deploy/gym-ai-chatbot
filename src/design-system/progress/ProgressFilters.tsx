import React from 'react';
import { Tabs, TabItem } from '../components/Tabs';

export interface ProgressFiltersProps {
  activeRange: string;
  onChangeRange: (rangeId: string) => void;
  className?: string;
}

export const ProgressFilters: React.FC<ProgressFiltersProps> = React.memo(({
  activeRange,
  onChangeRange,
  className,
}) => {
  const tabs: TabItem[] = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '3m', label: '3 Months' },
    { id: '1y', label: '1 Year' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeRange}
      onChange={onChangeRange}
      variant="pill"
      className={className}
    />
  );
});

ProgressFilters.displayName = 'ProgressFilters';
