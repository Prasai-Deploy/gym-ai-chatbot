/**
 * src/components/StreakToastContainer.tsx
 * Milestone toast notifications, bottom-right.
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame } from 'lucide-react';
import { StreakToast } from '../hooks/useGamification';

interface Props {
  toasts: StreakToast[];
  onDismiss: (id: string) => void;
}

export function StreakToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: StreakToast; onDismiss: (id: string) => void }) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors: Record<number, { bg: string; border: string; glow: string }> = {
    3:  { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', glow: '0 4px 24px rgba(249,115,22,0.3)' },
    7:  { bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.35)',  glow: '0 4px 24px rgba(168,85,247,0.3)' },
    30: { bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)',   glow: '0 4px 24px rgba(6,182,212,0.35)' },
  };
  const c = colors[toast.milestone] ?? colors[3];

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl max-w-xs"
      style={{
        background: `rgba(24,24,27,0.95)`,
        border: `1px solid ${c.border}`,
        boxShadow: c.glow,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
        style={{ background: c.bg }}>
        <Flame className="text-orange-400" size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
          Streak Milestone!
        </div>
        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity p-1"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
