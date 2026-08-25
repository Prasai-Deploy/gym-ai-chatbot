import React from 'react';
import { cn } from '../tokens';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  className,
  id,
  rows = 4,
  disabled,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-semibold text-slate-300 uppercase tracking-wider select-none"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        className={cn(
          'w-full bg-slate-900/80 text-white placeholder-slate-500 text-sm rounded-xl border p-3.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-y disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-white/10 hover:border-white/20 focus:border-brand-500',
          className
        )}
        {...props}
      />

      {error ? (
        <span className="text-xs text-red-400 font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-slate-500">{helperText}</span>
      ) : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';
