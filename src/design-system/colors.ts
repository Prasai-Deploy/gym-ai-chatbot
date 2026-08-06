/**
 * STRIVA v4 Design System - Color Tokens
 * Premium dark/light palette with high contrast (WCAG AA compliant)
 */

export const colors = {
  // Brand Accents
  primary: {
    DEFAULT: '#F97316', // STRIVA Hyper-Orange
    hover: '#EA580C',
    active: '#C2410C',
    subtle: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.3)',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  ai: {
    DEFAULT: '#6366F1', // Arcee Trinity Indigo
    hover: '#4F46E5',
    active: '#4338CA',
    subtle: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.3)',
    glow: 'rgba(99, 102, 241, 0.25)',
  },
  
  // Status / Feedback
  success: {
    DEFAULT: '#10B981',
    hover: '#059669',
    subtle: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  warning: {
    DEFAULT: '#F59E0B',
    hover: '#D97706',
    subtle: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  danger: {
    DEFAULT: '#EF4444',
    hover: '#DC2626',
    subtle: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
  },

  // Dark Theme Neutrals
  dark: {
    bgBase: '#090B10',
    bgSurface: '#131722',
    bgElevated: '#1A2030',
    bgOverlay: 'rgba(9, 11, 16, 0.85)',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
  },

  // Light Theme Neutrals
  light: {
    bgBase: '#F8FAFC',
    bgSurface: '#FFFFFF',
    bgElevated: '#F1F5F9',
    bgOverlay: 'rgba(248, 250, 252, 0.85)',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    borderSubtle: 'rgba(15, 23, 42, 0.08)',
    borderStrong: 'rgba(15, 23, 42, 0.16)',
  },
} as const;

export type Colors = typeof colors;
