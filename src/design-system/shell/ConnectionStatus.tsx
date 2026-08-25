import React, { useState, useEffect } from 'react';
import { Badge } from '../components/Badge';
import { Activity } from '../icons';
import { cn } from '../tokens';

export interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = React.memo(({
  className,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={cn('flex items-center gap-1.5 select-none', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]')} />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {isOnline ? 'LIVE' : 'OFFLINE'}
      </span>
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';
