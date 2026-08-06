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
    <div className={cn('flex items-center gap-2 select-none', className)}>
      <Badge
        variant={isOnline ? 'success' : 'danger'}
        size="sm"
        icon={<Activity className="w-3 h-3" />}
      >
        {isOnline ? 'WebSocket Live' : 'Offline Mode'}
      </Badge>
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';
