import React from 'react';
import { cn } from '../../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, onTabChange, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex bg-surface-elevated p-1 rounded-2xl border border-border-subtle overflow-x-auto no-scrollbar w-full sm:w-auto snap-x snap-proximity scroll-smooth',
          className
        )}
        {...props}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => {
              onTabChange(tab.id);
              document.getElementById(`tab-${tab.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap snap-center',
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
);
Tabs.displayName = 'Tabs';
