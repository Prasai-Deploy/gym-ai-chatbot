import React from 'react';
import { motion } from 'motion/react';
import { Bot, Sparkles } from '../icons';

export const TypingIndicator: React.FC = React.memo(() => {
  return (
    <div className="flex items-start gap-3 p-4 rounded-3xl bg-slate-900/80 border border-indigo-500/20 max-w-sm select-none">
      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
        <Bot className="w-4 h-4" />
      </div>

      <div className="flex flex-col gap-1.5 justify-center pt-1">
        <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Trinity AI is reasoning...</span>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <motion.span
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
            className="w-2 h-2 rounded-full bg-indigo-500"
          />
          <motion.span
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
            className="w-2 h-2 rounded-full bg-brand-500"
          />
          <motion.span
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
            className="w-2 h-2 rounded-full bg-emerald-500"
          />
        </div>
      </div>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';
