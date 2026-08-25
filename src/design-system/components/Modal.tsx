import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '../icons';
import { IconButton } from './IconButton';
import { cn } from '../tokens';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#050608]/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 w-full rounded-2xl bg-[#11141D] border border-white/[0.09] p-6 shadow-2xl overflow-hidden flex flex-col gap-4',
              sizeStyles[size],
              className
            )}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  {title && <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>}
                  {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
                <IconButton
                  icon={<X className="w-4 h-4" />}
                  aria-label="Close modal"
                  size="sm"
                  onClick={onClose}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-[70vh] pr-1">{children}</div>

            {footer && <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.07]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
