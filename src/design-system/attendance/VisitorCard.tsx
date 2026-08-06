import React from 'react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { MembershipValidation } from './MembershipValidation';
import { LogOut } from '../icons';

export interface VisitorRecord {
  id: string;
  name: string;
  avatarUrl?: string;
  planName: string;
  checkInTime: string;
  status: 'Valid' | 'Due Soon' | 'Expired' | 'Restricted';
}

export interface VisitorCardProps {
  visitor: VisitorRecord;
  onCheckOut?: (id: string) => void;
  onInspect?: (id: string) => void;
  className?: string;
}

export const VisitorCard: React.FC<VisitorCardProps> = React.memo(({
  visitor,
  onCheckOut,
  onInspect,
  className,
}) => {
  return (
    <Card
      variant="default"
      className={`p-4 flex items-center justify-between gap-3 transition-all select-none hover:border-white/20 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Avatar name={visitor.name} src={visitor.avatarUrl} size="md" />
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white cursor-pointer hover:underline" onClick={() => onInspect?.(visitor.id)}>
              {visitor.name}
            </h4>
            <MembershipValidation status={visitor.status} />
          </div>
          <span className="text-[10px] text-slate-400">
            {visitor.planName} • In: <span className="text-emerald-400 font-mono font-semibold">{visitor.checkInTime}</span>
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-400" />}
        onClick={() => onCheckOut?.(visitor.id)}
      >
        Check Out
      </Button>
    </Card>
  );
});

VisitorCard.displayName = 'VisitorCard';
