import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '../icons';
import { IconButton } from './IconButton';
import { cn } from '../tokens';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sideVariants = {
    left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
    right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#050608]/80 backdrop-blur-sm"
          />

          <motion.div
            initial={sideVariants[side].initial}
            animate={sideVariants[side].animate}
            exit={sideVariants[side].exit}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className={cn(
              'fixed top-0 bottom-0 z-10 w-full max-w-md bg-[#11141D] border-white/[0.08] p-6 shadow-2xl flex flex-col gap-6',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className
            )}
          >
            <div className="flex items-center justify-between">
              {title && <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>}
              <IconButton
                icon={<X className="w-4 h-4" />}
                aria-label="Close drawer"
                size="sm"
                onClick={onClose}
              />
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
