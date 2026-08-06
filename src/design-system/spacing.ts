/**
 * STRIVA v4 Design System - 8-Point Grid Spacing Tokens
 * Strictly enforcing 4, 8, 12, 16, 24, 32, 40, 48, 64, 96
 */

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  24: '96px',
} as const;

export type Spacing = keyof typeof spacing;
