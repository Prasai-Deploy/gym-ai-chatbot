import React from 'react';
import { Check } from '../icons';
import { cn } from '../tokens';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  error?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  checked,
  onChange,
  label,
  description,
  error = false,
  disabled,
  className,
  id,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  return (
    <label htmlFor={checkboxId} className={cn('inline-flex items-start gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            'w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-950',
            checked
              ? 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/20'
              : 'bg-slate-900 border-white/20 hover:border-white/40 text-transparent',
            error && !checked && 'border-red-500/80'
          )}
        >
          <Check className={cn('w-3.5 h-3.5 stroke-[3]', checked ? 'opacity-100' : 'opacity-0')} />
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-white">{label}</span>}
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
