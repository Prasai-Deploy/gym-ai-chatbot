import React, { useState, useEffect } from 'react';
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
      try {
        const count = await offlineSyncEngine.getPendingCount();
        setPendingCount(count);
      } catch {
        // Fallback gracefully if offline engine not initialized in dev mode
        setPendingCount(0);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) {
    return (
      <div className={cn('flex items-center gap-1 text-[10px] text-slate-400 select-none font-bold uppercase tracking-wider', className)}>
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>SYNCED</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold uppercase tracking-wider select-none', className)}>
      <RefreshCw className="w-3 h-3 animate-spin" />
      <span>{pendingCount} PENDING</span>
    </div>
  );
});

SyncStatusIndicator.displayName = 'SyncStatusIndicator';
