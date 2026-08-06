/**
 * STRIVA v4 Design System - Tokens & Utility Helpers
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { transitions, motionVariants } from './animations';
import { breakpoints } from './breakpoints';

/**
 * Standard utility to merge Tailwind classes safely with zero duplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  transitions,
  motionVariants,
  breakpoints,
} as const;

export type Tokens = typeof tokens;
