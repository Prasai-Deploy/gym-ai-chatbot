import React from 'react';
import { cn } from '../tokens';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  className?: string;
}

export const Radio: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  label,
  error,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider select-none">
          {label}
        </span>
      )}

      <div className="flex flex-col gap-2.5">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none',
                isSelected
                  ? 'bg-brand-500/10 border-brand-500/50 shadow-sm'
                  : 'bg-slate-900/60 border-white/10 hover:border-white/20',
                opt.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={isSelected}
                  disabled={opt.disabled}
                  onChange={() => !opt.disabled && onChange(opt.value)}
                  className="sr-only peer"
                />
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500',
                    isSelected ? 'border-brand-500 bg-brand-500' : 'border-white/30 bg-transparent'
                  )}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs text-slate-400">{opt.description}</span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
    </div>
  );
};
