import React from 'react';
import { Drawer } from '../components/Drawer';
import { Avatar } from '../components/Avatar';
import { MembershipValidation } from './MembershipValidation';
import { Button } from '../components/Button';
import { Check, LogOut } from '../icons';

export interface VisitorProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visitorName?: string;
  planName?: string;
  status?: 'Valid' | 'Due Soon' | 'Expired' | 'Restricted';
  checkInTime?: string;
  emergencyContact?: string;
}

export const VisitorProfileDrawer: React.FC<VisitorProfileDrawerProps> = React.memo(({
  isOpen,
  onClose,
  visitorName = 'Marcus Vance',
  planName = 'VIP Unlimited Pass',
  status = 'Valid',
  checkInTime = '08:30 AM',
  emergencyContact = 'Jane Vance (+1 555 019 2831)',
}) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Front Desk Visitor Verification" side="right">
      <div className="flex flex-col gap-6 select-none pb-8">
        {/* Photo ID & Status */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border border-white/10">
          <Avatar name={visitorName} size="xl" />
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-extrabold text-white">{visitorName}</h3>
            <span className="text-xs text-indigo-300 font-semibold">{planName}</span>
            <MembershipValidation status={status} />
          </div>
        </div>

        {/* Access Details */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Check-in Time Today:</span>
            <span className="font-mono font-bold text-emerald-400">{checkInTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Emergency Contact:</span>
            <span className="font-bold text-white">{emergencyContact}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Check className="w-4 h-4 stroke-[3]" />}
            onClick={onClose}
            className="flex-1"
          >
            Grant Access
          </Button>
          <Button
            variant="secondary"
            size="md"
            leftIcon={<LogOut className="w-4 h-4 text-slate-400" />}
            onClick={onClose}
            className="flex-1"
          >
            Check Out
          </Button>
        </div>
      </div>
    </Drawer>
  );
});

VisitorProfileDrawer.displayName = 'VisitorProfileDrawer';
