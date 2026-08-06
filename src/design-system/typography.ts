/**
 * STRIVA v4 Design System - Typography Tokens
 * Standardized scale: Display XL to Caption
 */

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'Outfit, Inter, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  
  scale: {
    displayXl: {
      fontSize: '2.5rem', // 40px
      lineHeight: '1.1',
      fontWeight: '800',
      letterSpacing: '-0.02em',
      fontFamily: 'Outfit, sans-serif',
    },
    displayL: {
      fontSize: '2rem', // 32px
      lineHeight: '1.15',
      fontWeight: '700',
      letterSpacing: '-0.015em',
      fontFamily: 'Outfit, sans-serif',
    },
    headingXl: {
      fontSize: '1.5rem', // 24px
      lineHeight: '1.25',
      fontWeight: '700',
      letterSpacing: '-0.01em',
    },
    headingL: {
      fontSize: '1.25rem', // 20px
      lineHeight: '1.3',
      fontWeight: '600',
      letterSpacing: '-0.005em',
    },
    headingM: {
      fontSize: '1.125rem', // 18px
      lineHeight: '1.35',
      fontWeight: '600',
    },
    bodyL: {
      fontSize: '1rem', // 16px
      lineHeight: '1.5',
      fontWeight: '400',
    },
    bodyM: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.45',
      fontWeight: '400',
    },
    bodyS: {
      fontSize: '0.75rem', // 12px
      lineHeight: '1.4',
      fontWeight: '400',
    },
    caption: {
      fontSize: '0.6875rem', // 11px
      lineHeight: '1.3',
      fontWeight: '500',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
  },
} as const;

export type Typography = typeof typography;
