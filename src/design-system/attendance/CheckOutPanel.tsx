import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LogOut } from '../icons';

export interface CheckOutPanelProps {
  onCheckOutAll?: () => void;
  className?: string;
}

export const CheckOutPanel: React.FC<CheckOutPanelProps> = React.memo(({
  onCheckOutAll,
  className,
}) => {
  return (
    <Card variant="default" className={`p-4 flex items-center justify-between gap-3 select-none ${className}`}>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-white">Facility Closing Operations</span>
        <span className="text-[10px] text-slate-400">Bulk checkout remaining visitors at end of day</span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-400" />}
        onClick={onCheckOutAll}
      >
        Check Out All Occupants
      </Button>
    </Card>
  );
});

CheckOutPanel.displayName = 'CheckOutPanel';
