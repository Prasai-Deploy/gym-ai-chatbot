export const springs = {
  soft: { type: 'spring', stiffness: 200, damping: 25 },
  responsive: { type: 'spring', stiffness: 350, damping: 28 },
  bouncy: { type: 'spring', stiffness: 450, damping: 20 },
  snappy: { type: 'spring', stiffness: 600, damping: 35 }
};

export const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springs.responsive },
  exit: { opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.2 } }
};
