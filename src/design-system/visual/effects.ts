/**
 * STRIVA v4 Visual System - Effects (Borders, Restrained Glows & Shadows)
 */

export const visualEffects = {
  // Border Opacity Scale
  borders: {
    subtle: '1px solid rgba(255, 255, 255, 0.07)',
    medium: '1px solid rgba(255, 255, 255, 0.12)',
    strong: '1px solid rgba(255, 255, 255, 0.18)',
    primary: '1px solid rgba(249, 115, 22, 0.35)',
    ai: '1px solid rgba(99, 102, 241, 0.35)',
  },

  // Restrained Ambient Glows (Only for active / focused telemetry)
  glows: {
    none: 'none',
    primary: '0 0 24px rgba(249, 115, 22, 0.18)',
    ai: '0 0 24px rgba(99, 102, 241, 0.18)',
    success: '0 0 20px rgba(16, 185, 129, 0.18)',
    warning: '0 0 20px rgba(245, 158, 11, 0.18)',
    danger: '0 0 20px rgba(239, 68, 68, 0.18)',
  },

  // Atmospheric Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.55), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.65), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    panel: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    modal: '0 24px 48px -12px rgba(0, 0, 0, 0.75)',
  },

  // Subtle Backdrop Blurs
  blurs: {
    subtle: 'backdrop-blur-md',
    panel: 'backdrop-blur-xl',
    overlay: 'backdrop-blur-2xl',
  },
} as const;

export type VisualEffects = typeof visualEffects;
