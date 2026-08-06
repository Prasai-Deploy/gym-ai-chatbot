import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from '../icons';
import { cn } from '../tokens';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}) => {
  const variantStyles = {
    info: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    danger: 'bg-red-500/10 border-red-500/30 text-red-200',
  };

  const icons = {
    info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
  };

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-2xl border transition-all', variantStyles[variant], className)} role="alert">
      {icons[variant]}
      <div className="flex-1 flex flex-col gap-0.5">
        {title && <span className="text-sm font-bold text-white tracking-tight">{title}</span>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="p-1 hover:bg-white/10 rounded-lg text-current">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
