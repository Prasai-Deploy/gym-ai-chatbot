/**
 * src/components/StreakDisplay.tsx
 * Shows 🔥 N in the header, with a glow ring at streak >= 7.
 */
import React from 'react';
import { Flame } from 'lucide-react';

interface Props {
  streak: number;
}

export function StreakDisplay({ streak }: Props) {
  const hasGlow = streak >= 7;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm select-none transition-all"
      style={{
        background: streak > 0 ? 'rgba(249,115,22,0.12)' : 'var(--surface-elevated)',
        border: `1px solid ${streak > 0 ? 'rgba(249,115,22,0.3)' : 'var(--glass-border)'}`,
        boxShadow: hasGlow ? '0 0 12px rgba(249,115,22,0.4), 0 0 24px rgba(249,115,22,0.15)' : undefined,
        color: streak > 0 ? '#fb923c' : 'var(--text-muted)',
      }}
    >
      <Flame
        size={15}
        className={streak > 0 ? 'text-orange-400' : ''}
        style={hasGlow ? { filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.8))' } : undefined}
      />
      <span>{streak}</span>
    </div>
  );
}
