/**
 * STRIVA v4 Design System - Shadows and Glow Effects
 */

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  
  // Brand Glows
  glowPrimary: '0 0 35px rgba(249, 115, 22, 0.25)',
  glowAi: '0 0 35px rgba(99, 102, 241, 0.25)',
  glowSuccess: '0 0 25px rgba(16, 185, 129, 0.25)',

  // Glassmorphism effects
  glassSm: 'backdrop-blur(8px) bg-surface/70 border border-white/10',
  glassLg: 'backdrop-blur(16px) bg-surface/80 border border-white/15 shadow-xl',
} as const;

export type Shadows = typeof shadows;
