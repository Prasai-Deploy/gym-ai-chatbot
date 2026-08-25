import React from 'react';
import { User, Bot } from '../icons';
import { cn } from '../tokens';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  isBot?: boolean;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  isBot = false,
  size = 'md',
  status,
  className,
}) => {
  const sizeStyles: Record<AvatarSize, string> = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const statusColor: Record<AvatarStatus, string> = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-500',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
  };

  const getInitials = (strName?: string) => {
    if (!strName) return '';
    const parts = strName.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full border border-white/10 font-bold tracking-wider',
          sizeStyles[size],
          isBot
            ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
            : 'bg-slate-800 text-brand-400'
        )}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : name ? (
          <span>{getInitials(name)}</span>
        ) : isBot ? (
          <Bot className="w-1/2 h-1/2" />
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-slate-950',
            size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4',
            statusColor[status]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};
