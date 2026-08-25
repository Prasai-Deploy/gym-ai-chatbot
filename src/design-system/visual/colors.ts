/**
 * STRIVA v4 Visual System - Color Tokens
 * Premium, minimal, futuristic palette with dark-first hierarchy.
 * WCAG AA High Contrast Compliant.
 */

export const visualColors = {
  // Dark-First Surface Hierarchy
  dark: {
    void: '#050608',       // Deepest background canvas / foundation
    base: '#090B10',       // Default application canvas
    surface: '#11141D',    // Standard card & panel surface
    elevated: '#181C28',   // Elevated panels, dropdowns, floating sheets
    focus: '#1F2433',      // Active / focused interactive state
    overlay: 'rgba(5, 6, 8, 0.82)', // Backdrop overlay with blur
    
    // Text Hierarchy
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textTechnical: '#CBD5E1',

    // Subtle Borders (6-12% opacity)
    borderSubtle: 'rgba(255, 255, 255, 0.07)',
    borderMedium: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
    borderFocus: 'rgba(249, 115, 22, 0.45)',
  },

  // Brand Accents
  primary: {
    DEFAULT: '#F97316', // STRIVA Hyper Orange (Primary CTA, focus, active navigation)
    hover: '#EA580C',
    active: '#C2410C',
    subtle: 'rgba(249, 115, 22, 0.10)',
    border: 'rgba(249, 115, 22, 0.28)',
    glow: 'rgba(249, 115, 22, 0.20)',
  },

  // AI Intelligence Accent
  ai: {
    DEFAULT: '#6366F1', // Trinity AI Indigo (AI coaching & intelligence surfaces)
    hover: '#4F46E5',
    active: '#4338CA',
    subtle: 'rgba(99, 102, 241, 0.10)',
    border: 'rgba(99, 102, 241, 0.28)',
    glow: 'rgba(99, 102, 241, 0.20)',
  },

  // Status & Telemetry
  success: {
    DEFAULT: '#10B981', // Emerald
    hover: '#059669',
    subtle: 'rgba(16, 185, 129, 0.10)',
    border: 'rgba(16, 185, 129, 0.28)',
    glow: 'rgba(16, 185, 129, 0.20)',
  },
  warning: {
    DEFAULT: '#F59E0B', // Amber
    hover: '#D97706',
    subtle: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.28)',
    glow: 'rgba(245, 158, 11, 0.20)',
  },
  danger: {
    DEFAULT: '#EF4444', // Red
    hover: '#DC2626',
    subtle: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.28)',
    glow: 'rgba(239, 68, 68, 0.20)',
  },
  telemetry: {
    DEFAULT: '#06B6D4', // Cyan (Instrumentation & live telemetry)
    subtle: 'rgba(6, 182, 212, 0.10)',
    border: 'rgba(6, 182, 212, 0.28)',
  },

  // Light Mode Neutrals (Preserved for accessibility & theme switching)
  light: {
    void: '#F1F5F9',
    base: '#F8FAFC',
    surface: '#FFFFFF',
    elevated: '#F1F5F9',
    focus: '#E2E8F0',
    overlay: 'rgba(15, 23, 42, 0.60)',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textTechnical: '#334155',
    borderSubtle: 'rgba(15, 23, 42, 0.08)',
    borderMedium: 'rgba(15, 23, 42, 0.14)',
    borderStrong: 'rgba(15, 23, 42, 0.22)',
    borderFocus: 'rgba(249, 115, 22, 0.50)',
  },
} as const;

export type VisualColors = typeof visualColors;
