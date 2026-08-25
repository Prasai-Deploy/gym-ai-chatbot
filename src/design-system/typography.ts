/**
 * STRIVA v4 Design System - Typography Tokens
 * Standardized scale: Display Hero to Technical Label
 */

import { visualTypography } from './visual/typography';

export const typography = {
  fontFamily: visualTypography.fontFamily,
  display: visualTypography.display,
  technical: visualTypography.technical,
  scale: {
    ...visualTypography.scale,
    displayXl: visualTypography.display.metricLarge,
    displayL: visualTypography.display.metricMedium,
    caption: {
      fontSize: '0.6875rem', // 11px
      lineHeight: '1.3',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.12em',
    },
  },
} as const;

export type Typography = typeof typography;
