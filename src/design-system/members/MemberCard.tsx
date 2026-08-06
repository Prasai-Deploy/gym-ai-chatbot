import React from 'react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { HealthScore } from './HealthScore';
import { MembershipStatus } from './MembershipStatus';
import { ChevronRight } from '../icons';

export interface MemberRecord {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  planName: string;
  status: 'Active' | 'Due Soon' | 'Expired' | 'Paused';
  healthScore: number;
  assignedTrainer: string;
  joinDate: string;
  expiryDate: string;
  checkinsThisMonth: number;
}

export interface MemberCardProps {
  member: MemberRecord;
  onSelectMember?: (id: string) => void;
  className?: string;
}

export const MemberCard: React.FC<MemberCardProps> = React.memo(({
  member,
  onSelectMember,
  className,
}) => {
  return (
    <Card
      variant="default"
      className={`p-4 flex flex-col gap-3 transition-all select-none hover:border-white/20 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} src={member.avatarUrl} size="md" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white">{member.name}</h4>
              <MembershipStatus status={member.status} />
            </div>
            <span className="text-[10px] text-slate-400">{member.email}</span>
          </div>
        </div>

        <HealthScore score={member.healthScore} />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/5">
        <span className="font-semibold">{member.planName}</span>
        <span className="text-[10px] text-slate-400">Trainer: <span className="text-white font-bold">{member.assignedTrainer}</span></span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-400">
          {member.checkinsThisMonth} Check-ins This Month
        </span>

        <Button
          variant="ghost"
          size="sm"
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          onClick={() => onSelectMember?.(member.id)}
        >
          View Profile
        </Button>
      </div>
    </Card>
  );
});

MemberCard.displayName = 'MemberCard';
