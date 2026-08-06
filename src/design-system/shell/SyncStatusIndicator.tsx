import React, { useState, useEffect } from 'react';
import { Badge } from '../components/Badge';
import { RefreshCw, CheckCircle2 } from '../icons';
import { offlineSyncEngine } from '../../services/offline/OfflineSyncEngine';
import { cn } from '../tokens';

export interface SyncStatusIndicatorProps {
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = React.memo(({
  className,
}) => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPending = async () => {
      const count = await offlineSyncEngine.getPendingCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) {
    return (
      <div className={cn('flex items-center gap-1 text-[11px] text-emerald-400 select-none', className)}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="font-semibold">All Synced</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 select-none', className)}>
      <Badge variant="warning" size="sm" icon={<RefreshCw className="w-3 h-3 animate-spin" />}>
        Syncing {pendingCount} Pending
      </Badge>
    </div>
  );
});

SyncStatusIndicator.displayName = 'SyncStatusIndicator';
