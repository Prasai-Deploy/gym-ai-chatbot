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
        'flex items-center gap-1 p-1 select-none overflow-x-auto no-scrollbar',
        variant === 'pill' ? 'bg-[#11141D] border border-white/[0.07] rounded-xl' : 'border-b border-white/[0.08]',
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
              'relative flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
              isActive
                ? 'text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {isActive && variant === 'pill' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-orange-500 rounded-lg shadow-sm shadow-orange-500/20"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}

            {tab.icon && <span className="relative z-10">{tab.icon}</span>}
            <span className="relative z-10">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="relative z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white">
                {tab.badge}
              </span>
            )}

            {isActive && variant === 'underline' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
