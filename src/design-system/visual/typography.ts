/**
 * STRIVA v4 Visual System - Typography Architecture
 * Display Metrics (Outfit) + Technical UI (Inter / Mono)
 */

export const visualTypography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'Outfit, Inter, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },

  // Display Typography for Primary Metrics (Health Score, Readiness, Revenue, etc.)
  display: {
    hero: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '3.5rem', // 56px
      lineHeight: '1.05',
      fontWeight: '800',
      letterSpacing: '-0.03em',
    },
    metricLarge: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '2.5rem', // 40px
      lineHeight: '1.1',
      fontWeight: '800',
      letterSpacing: '-0.025em',
    },
    metricMedium: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '1.875rem', // 30px
      lineHeight: '1.15',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
  },

  // Technical Small Uppercase Labels (READINESS, RECOVERY, MRR, ACTIVE MEMBERS, AI STATUS)
  technical: {
    labelL: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '0.75rem', // 12px
      lineHeight: '1.3',
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.12em',
    },
    labelM: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '0.6875rem', // 11px
      lineHeight: '1.3',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.14em',
    },
    labelS: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '0.625rem', // 10px
      lineHeight: '1.25',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.16em',
    },
  },

  // Standard Scale
  scale: {
    headingXl: { fontSize: '1.5rem', lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.015em' },
    headingL: { fontSize: '1.25rem', lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' },
    headingM: { fontSize: '1.125rem', lineHeight: '1.35', fontWeight: '600', letterSpacing: '-0.005em' },
    bodyL: { fontSize: '1rem', lineHeight: '1.5', fontWeight: '400' },
    bodyM: { fontSize: '0.875rem', lineHeight: '1.45', fontWeight: '400' },
    bodyS: { fontSize: '0.75rem', lineHeight: '1.4', fontWeight: '400' },
  },
} as const;

export type VisualTypography = typeof visualTypography;
