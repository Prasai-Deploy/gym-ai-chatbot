import React from 'react';
import { motion } from 'motion/react';
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
    <div className="md:hidden fixed bottom-[calc(max(10px,env(safe-area-inset-bottom))+78px)] right-4 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="flex flex-col items-end gap-2.5"
        >
          <button
            type="button"
            onClick={() => {
              onQuickAction('coach');
              setIsOpen(false);
            }}
            className="glass-nav flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-white text-xs font-bold border-indigo-500/30"
          >
            <span>Ask AI Coach</span>
            <Bot className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              onQuickAction('workout');
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-brand-500 text-white text-xs font-bold shadow-xl shadow-brand-500/20 border border-brand-400/30"
          >
            <span>Log Workout</span>
            <Flame className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Quick Action Floating Button"
        className={cn(
          'w-13 h-13 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-2xl shadow-brand-500/25 border border-brand-400/30 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 touch-manipulation',
          isOpen && 'rotate-45'
        )}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </motion.button>
    </div>
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';
