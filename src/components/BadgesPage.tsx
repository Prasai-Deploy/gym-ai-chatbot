/**
 * src/components/BadgesPage.tsx
 * Full badges page — earned (color) + locked (greyed) badge grid.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Trophy, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

interface Badge {
  key: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earned_at: string | null;
}

interface BadgesData {
  badges: Badge[];
  totalEarned: number;
  total: number;
}

export function BadgesPage() {
  const [data, setData] = useState<BadgesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/gamification/badges');
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
        {Array(12).fill(null).map((_, i) => (
          <div key={i} className="aspect-square glass-panel rounded-2xl animate-pulse" />
        ))}
      </div>
      </div>
    );
  }

  const badges = data?.badges ?? [];
  const earned = data?.totalEarned ?? 0;
  const total = data?.total ?? 0;
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
            Achievements
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {earned} of {total} badges earned
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-1 sm:w-48 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)', minWidth: 120 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'var(--gradient-primary)' }}
            />
          </div>
          <span className="text-sm font-black flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Earned', value: earned, icon: '🏅' },
          { label: 'Locked', value: total - earned, icon: '🔒' },
          { label: 'Completion', value: `${pct}%`, icon: '📈' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-panel rounded-2xl p-4 text-center"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
        {badges.map((badge, i) => (
          <BadgeCard key={badge.key} badge={badge} delay={i * 0.04} />
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ badge, delay }: { badge: Badge; delay: number }) {
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay, duration: 0.35, ease: 'easeOut' }}
        onClick={() => setShowSheet(true)}
        className="relative aspect-square flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl glass-panel transition-all duration-200 cursor-pointer select-none active:scale-95"
        style={{
          border: badge.earned
            ? '1px solid rgba(124,58,237,0.3)'
            : '1px solid var(--glass-border)',
          filter: badge.earned ? undefined : 'grayscale(1) opacity(0.5)',
        }}
      >
        {/* Lock overlay for locked badges */}
        {!badge.earned && (
          <div className="absolute top-1.5 right-1.5">
            <Lock size={10} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* Badge icon */}
        <div
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-2"
          style={{
            background: badge.earned
              ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))'
              : 'var(--surface-elevated)',
          }}
        >
          {badge.icon}
        </div>

        <div className="text-[10px] sm:text-xs font-bold leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {badge.name}
        </div>

        {/* Earned indicator */}
        {badge.earned && (
          <div className="absolute top-1.5 right-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--gradient-success)' }}>
              <span className="text-[7px] sm:text-[8px] text-white font-black">✓</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Detail Bottom Sheet */}
      <AnimatePresence>
        {showSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[110]"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setShowSheet(false); }}
              className="fixed bottom-0 left-0 right-0 z-[120] bg-[var(--surface-card)] backdrop-blur-xl border-t border-[var(--glass-border)] rounded-t-[32px] px-6 pb-12 pt-4"
              style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}
            >
              {/* Handle Bar */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-xl"
                  style={{ 
                    background: badge.earned 
                      ? 'var(--gradient-primary)' 
                      : 'var(--surface-elevated)',
                    filter: badge.earned ? undefined : 'grayscale(1)'
                  }}>
                  {badge.icon}
                </div>
                <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>{badge.name}</h3>
                <p className="text-sm px-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {badge.description}
                </p>
                
                {badge.earned && badge.earned_at ? (
                  <div className="mt-8 px-4 py-2 rounded-full text-xs font-bold text-emerald-400" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    UNLOCKED ON {badge.earned_at.toUpperCase()}
                  </div>
                ) : (
                  <div className="mt-8 px-4 py-2 rounded-full text-xs font-bold text-amber-400 border border-amber-400/20" style={{ background: 'rgba(245,158,11,0.05)' }}>
                    LOCKED ACHIEVEMENT
                  </div>
                )}
                
                <button 
                  onClick={() => setShowSheet(false)}
                  className="mt-10 w-full py-4 rounded-2xl bg-[var(--surface-elevated)] text-white font-bold active:scale-95 transition-all border border-[var(--glass-border)]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
