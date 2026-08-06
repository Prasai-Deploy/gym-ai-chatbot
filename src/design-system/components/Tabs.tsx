import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../tokens';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 p-1 select-none overflow-x-auto no-scrollbar',
        variant === 'pill' ? 'bg-slate-900/80 border border-white/10 rounded-2xl' : 'border-b border-white/10',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
              isActive
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isActive && variant === 'pill' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-orange-500 rounded-xl shadow-md shadow-orange-500/20"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            {tab.icon && <span className="relative z-10">{tab.icon}</span>}
            <span className="relative z-10">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="relative z-10 px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 text-white">
                {tab.badge}
              </span>
            )}

            {isActive && variant === 'underline' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
