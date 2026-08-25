/**
 * STRIVA v4 Design System - Animation Tokens & Unified Motion Presets
 */

import { visualTransitions, visualMotionVariants } from './visual/motion';

export const transitions = {
  ...visualTransitions,
  spring: visualTransitions.springNormal,
  bounce: { type: 'spring', stiffness: 480, damping: 24 },
} as const;

export const motionVariants = {
  ...visualMotionVariants,
  scaleUp: visualMotionVariants.scaleIn,
  slideUp: visualMotionVariants.fadeUp,
  slideDown: {
    initial: { opacity: 0, y: -12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  },
  drawerRight: visualMotionVariants.drawer,
  bottomSheet: {
    initial: { y: '100%' },
    animate: { y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } },
    exit: { y: '100%', transition: { duration: 0.2 } },
  },
} as const;
