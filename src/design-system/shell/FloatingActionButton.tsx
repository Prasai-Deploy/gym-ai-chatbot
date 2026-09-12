import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Bot, Flame } from '../icons';
import { cn } from '../tokens';

export interface FloatingActionButtonProps {
  onQuickAction: (type: 'workout' | 'coach') => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = React.memo(({
  onQuickAction,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="md:hidden fixed bottom-18 right-4 z-50 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="flex flex-col items-end gap-2"
          >
            <button
              type="button"
              onClick={() => {
                onQuickAction('coach');
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181C28] text-indigo-300 text-xs font-bold shadow-xl border border-indigo-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span>Trinity Coach</span>
              <Bot className="w-4 h-4 text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onQuickAction('workout');
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181C28] text-orange-400 text-xs font-bold shadow-xl border border-orange-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <span>Log Session</span>
              <Flame className="w-4 h-4 text-orange-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Quick Action Control"
        className={cn(
          'w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 border border-orange-400/30 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
          isOpen && 'rotate-45'
        )}
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </motion.button>
    </div>
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';
