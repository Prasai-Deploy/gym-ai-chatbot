/**
 * STRIVA v4 Design System - Border Radius Tokens
 */

export const radius = {
  none: '0px',
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

export type Radius = keyof typeof radius;
