/**
 * STRIVA v4 Design System - Color Tokens
 * Premium dark/light palette with high contrast (WCAG AA compliant)
 */

import { visualColors } from './visual/colors';

export const colors = {
  // Brand Accents
  primary: visualColors.primary,
  brand: visualColors.brand,
  action: visualColors.action,
  ai: visualColors.ai,
  lime: visualColors.lime,
  
  // Status / Feedback
  success: visualColors.success,
  warning: visualColors.warning,
  danger: visualColors.danger,
  telemetry: visualColors.telemetry,

  // Dark Theme Neutrals (Void -> Base -> Surface -> Elevated -> Focus)
  dark: visualColors.dark,

  // Light Theme Neutrals
  light: visualColors.light,
} as const;

export type Colors = typeof colors;
