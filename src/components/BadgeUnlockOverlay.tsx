/**
 * src/components/BadgeUnlockOverlay.tsx
 * Full-screen overlay shown for 2.5s when a badge is earned.
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BadgeUnlock } from '../hooks/useGamification';

interface Props {
  badge: BadgeUnlock | null;
  onDismiss: () => void;
}

export function BadgeUnlockOverlay({ badge, onDismiss }: Props) {
  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [badge, onDismiss]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(20px)' }}
          onClick={onDismiss}
        >
          {/* Radial glow behind badge */}
          <div
            className="absolute"
            style={{
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
            className="relative flex flex-col items-center gap-5 px-8 py-10 rounded-[32px] text-center max-w-xs mx-4"
            style={{
              background: 'rgba(24,24,27,0.8)',
              border: '1px solid rgba(124,58,237,0.4)',
              boxShadow: '0 0 40px rgba(124,58,237,0.3), 0 0 80px rgba(236,72,153,0.15)',
            }}
          >
            {/* UNLOCKED label */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-black uppercase tracking-[0.25em]"
              style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              🏅 Badge Unlocked!
            </motion.div>

            {/* Badge icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
              className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.3))',
                border: '2px solid rgba(124,58,237,0.5)',
                boxShadow: '0 0 30px rgba(124,58,237,0.4)',
              }}
            >
              {badge.icon}
            </motion.div>

            {/* Badge name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                {badge.name}
              </div>
              <div className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {badge.description}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs" style={{ color: 'var(--text-muted)' }}
            >
              Tap anywhere to continue
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
