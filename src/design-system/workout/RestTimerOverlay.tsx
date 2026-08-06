import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProgressRing } from '../components/ProgressRing';
import { Button } from '../components/Button';
import { Plus, Play } from '../icons';

export interface RestTimerOverlayProps {
  isOpen: boolean;
  secondsRemaining: number;
  totalRestSeconds?: number;
  onAddThirtySec: () => void;
  onSkipRest: () => void;
}

export const RestTimerOverlay: React.FC<RestTimerOverlayProps> = React.memo(({
  isOpen,
  secondsRemaining,
  totalRestSeconds = 90,
  onAddThirtySec,
  onSkipRest,
}) => {
  const percentage = Math.min(Math.round((secondsRemaining / totalRestSeconds) * 100), 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 p-8 shadow-2xl flex flex-col items-center gap-6 text-center select-none"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Rest & Recovery</span>
              <h3 className="text-xl font-black text-white">Prepare for Next Set</h3>
            </div>

            <ProgressRing value={percentage} size={150} strokeWidth={12} variant="primary" label={`${secondsRemaining}s`} />

            <div className="flex items-center gap-3 w-full">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Plus className="w-4 h-4 text-orange-400" />}
                onClick={onAddThirtySec}
                className="flex-1"
              >
                +30s
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Play className="w-4 h-4 fill-white" />}
                onClick={onSkipRest}
                className="flex-1"
              >
                Skip Rest
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

RestTimerOverlay.displayName = 'RestTimerOverlay';
