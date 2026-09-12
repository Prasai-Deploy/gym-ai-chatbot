/**
 * STRIVA v4 Visual System - Unified Motion System (Framer Motion / Motion Presets)
 * Fast, precise, cinematic, subtle interactions.
 */

export const visualTransitions = {
  instant: { duration: 0.1, ease: [0.16, 1, 0.3, 1] },
  fast: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
  normal: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
  smooth: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  springFast: { type: 'spring', stiffness: 450, damping: 32 },
  springNormal: { type: 'spring', stiffness: 380, damping: 28 },
} as const;

export const visualMotionVariants = {
  pageEnter: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  },

  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },

  fadeUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
  },

  slideIn: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, x: 16, transition: { duration: 0.15 } },
  },

  hover: {
    scale: 1.015,
    transition: { duration: 0.15, ease: 'easeOut' },
  },

  press: {
    scale: 0.98,
    transition: { duration: 0.08, ease: 'easeOut' },
  },

  modal: {
    initial: { opacity: 0, scale: 0.96, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 30 } },
    exit: { opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.15 } },
  },

  drawer: {
    initial: { x: '100%' },
    animate: { x: 0, transition: { type: 'spring', stiffness: 360, damping: 32 } },
    exit: { x: '100%', transition: { duration: 0.2 } },
  },

  notification: {
    initial: { opacity: 0, y: 16, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 28 } },
    exit: { opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.15 } },
  },

  dataUpdate: {
    initial: { opacity: 0.5, filter: 'brightness(1.2)' },
    animate: { opacity: 1, filter: 'brightness(1)', transition: { duration: 0.3 } },
  },
} as const;

export type VisualMotionVariants = typeof visualMotionVariants;
