import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Shield, Zap } from '../icons';

export interface RFIDScannerProps {
  onScanSuccess?: (tagId: string) => void;
  className?: string;
}

export const RFIDScanner: React.FC<RFIDScannerProps> = React.memo(({
  onScanSuccess,
  className,
}) => {
  const [scanning, setScanning] = useState(false);

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      if (onScanSuccess) onScanSuccess('NFC-TAG-9921');
    }, 1000);
  };

  return (
    <Card variant="glass" className={`p-4 flex flex-col items-center justify-center text-center gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">NFC / RFID Keyfob Reader</span>
        <Badge variant="success" size="sm">Turnstile A Online</Badge>
      </div>

      <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-white/20 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
        {scanning && <div className="absolute inset-0 bg-amber-500/20 animate-pulse" />}
        <Shield className="w-8 h-8 text-amber-400" />
        <span className="text-[9px] text-slate-400 font-mono">Tap NFC Keyfob</span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
        onClick={handleSimulateScan}
        disabled={scanning}
      >
        {scanning ? 'Reading NFC Tag...' : 'Simulate Keyfob Tap'}
      </Button>
    </Card>
  );
});

RFIDScanner.displayName = 'RFIDScanner';
