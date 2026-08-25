import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../tokens';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  id,
}) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;

  const trackSizes = {
    sm: 'w-8 h-4 p-0.5',
    md: 'w-11 h-6 p-1',
    lg: 'w-14 h-7 p-1',
  };

  const thumbSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const translateOffsets = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  return (
    <label htmlFor={switchId} className={cn('inline-flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          trackSizes[size],
          checked ? 'bg-brand-500 shadow-md shadow-brand-500/20' : 'bg-slate-800 border border-white/10'
        )}
      >
        <motion.span
          animate={{ x: checked ? translateOffsets[size] : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'inline-block rounded-full bg-white shadow-sm pointer-events-none',
            thumbSizes[size]
          )}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-white">{label}</span>}
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      )}
    </label>
  );
};
