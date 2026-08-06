import React from 'react';
import { Card } from '../components/Card';
import { QRScanner } from './QRScanner';
import { RFIDScanner } from './RFIDScanner';

export interface ScannerPanelProps {
  onScanResult?: (result: string) => void;
  className?: string;
}

export const ScannerPanel: React.FC<ScannerPanelProps> = React.memo(({
  onScanResult = (res) => console.log('Scanner result:', res),
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Multi-Modal Hardware Scanner Suite</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QRScanner onScanSuccess={onScanResult} />
        <RFIDScanner onScanSuccess={onScanResult} />
      </div>
    </Card>
  );
});

ScannerPanel.displayName = 'ScannerPanel';
