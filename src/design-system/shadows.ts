/**
 * STRIVA v4 Design System - Shadows and Restrained Glow Effects
 */

import { visualEffects } from './visual/effects';

export const shadows = {
  sm: visualEffects.shadows.sm,
  md: visualEffects.shadows.md,
  lg: visualEffects.shadows.lg,
  xl: visualEffects.shadows.xl,
  panel: visualEffects.shadows.panel,
  modal: visualEffects.shadows.modal,
  
  // Brand Restrained Glows
  glowPrimary: visualEffects.glows.primary,
  glowAi: visualEffects.glows.ai,
  glowSuccess: visualEffects.glows.success,
  glowWarning: visualEffects.glows.warning,
  glowDanger: visualEffects.glows.danger,

  // Minimal glass effect
  glassSm: 'backdrop-blur(8px) bg-[#11141D]/80 border border-white/[0.07]',
  glassLg: 'backdrop-blur(16px) bg-[#181C28]/85 border border-white/[0.10] shadow-xl',
} as const;

export type Shadows = typeof shadows;
