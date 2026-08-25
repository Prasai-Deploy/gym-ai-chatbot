import React from 'react';
import { X } from '../icons';
import { cn } from '../tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onSelect,
  onRemove,
  icon,
  disabled = false,
  className,
}) => {
  return (
    <div
      onClick={disabled ? undefined : onSelect}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none',
        onSelect && !disabled && 'cursor-pointer active:scale-95',
        selected
          ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20 border border-brand-400/40'
          : 'bg-slate-900/80 text-slate-300 border border-white/10 hover:border-white/20 hover:text-white',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onRemove();
          }}
          className="p-0.5 rounded-full hover:bg-white/20 text-current transition-colors"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
