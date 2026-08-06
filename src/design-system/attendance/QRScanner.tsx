import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Monitor, Check } from '../icons';

export interface QRScannerProps {
  onScanSuccess?: (passCode: string) => void;
  className?: string;
}

export const QRScanner: React.FC<QRScannerProps> = React.memo(({
  onScanSuccess,
  className,
}) => {
  const [scanning, setScanning] = useState(false);

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      if (onScanSuccess) onScanSuccess('QR-8842-VIP');
    }, 1200);
  };

  return (
    <Card variant="glass" className={`p-4 flex flex-col items-center justify-center text-center gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mobile QR Code Pass</span>
        <Badge variant="primary" size="sm">Camera Active</Badge>
      </div>

      <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-white/20 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
        {scanning && <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />}
        <Monitor className="w-8 h-8 text-indigo-400" />
        <span className="text-[9px] text-slate-400 font-mono">Scan App QR</span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
        onClick={handleSimulateScan}
        disabled={scanning}
      >
        {scanning ? 'Validating QR Pass...' : 'Simulate Member QR Scan'}
      </Button>
    </Card>
  );
});

QRScanner.displayName = 'QRScanner';
