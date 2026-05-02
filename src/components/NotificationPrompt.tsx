/**
 * src/components/NotificationPrompt.tsx
 * Friendly in-app prompt shown after onboarding to request push permission.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff } from 'lucide-react';

interface Props {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

export function NotificationPrompt({ visible, onAllow, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(9,9,11,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ y: 60, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-sm rounded-3xl p-6 text-center"
            style={{
              background: 'rgba(24,24,27,0.97)',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 0 60px rgba(124,58,237,0.2)',
            }}
          >
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))' }}
            >
              <Bell size={28} style={{ color: 'var(--gradient-primary)' }} className="text-purple-400" />
            </div>

            <h3 className="text-lg font-black mb-2" style={{ color: 'var(--text-primary)' }}>
              Stay on Track
            </h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Want daily workout reminders from your AI coach? We'll nudge you when it's time to move and alert you when you earn a badge.
            </p>

            <div className="flex flex-col gap-3">
              <button
                id="notif-allow-btn"
                onClick={onAllow}
                className="w-full py-3 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Bell size={16} />
                Yes, remind me!
              </button>
              <button
                onClick={onDismiss}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
