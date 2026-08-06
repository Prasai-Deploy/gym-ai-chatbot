import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from '../icons';
import { cn } from '../tokens';

export interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpandedIds?: string[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultExpandedIds = [],
  className,
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>(defaultExpandedIds);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setExpandedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setExpandedIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {items.map((item) => {
        const isExpanded = expandedIds.includes(item.id);
        return (
          <div
            key={item.id}
            className="rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden transition-all duration-200 hover:border-white/20"
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isExpanded}
              className="w-full flex items-center justify-between p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <div className="flex items-center gap-3">
                {item.icon && <span className="text-orange-400">{item.icon}</span>}
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{item.title}</span>
                  {item.subtitle && <span className="text-xs text-slate-400">{item.subtitle}</span>}
                </div>
              </div>

              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400 shrink-0"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 text-xs leading-relaxed text-slate-300 border-t border-white/5 mt-1">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
