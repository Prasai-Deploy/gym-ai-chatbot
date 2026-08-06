import React from 'react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { HealthScore } from './HealthScore';
import { MembershipStatus } from './MembershipStatus';
import { MemberRecord } from './MemberCard';
import { ChevronRight } from '../icons';

export interface MemberTableProps {
  members: MemberRecord[];
  onSelectMember: (id: string) => void;
  className?: string;
}

export const MemberTable: React.FC<MemberTableProps> = React.memo(({
  members,
  onSelectMember,
  className,
}) => {
  return (
    <Card variant="default" className={`p-0 overflow-hidden select-none ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">Member</th>
              <th className="p-4">Membership Plan</th>
              <th className="p-4">Health & Adherence</th>
              <th className="p-4">Assigned Trainer</th>
              <th className="p-4">Check-ins</th>
              <th className="p-4 text-right">Status & Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} src={m.avatarUrl} size="sm" />
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{m.name}</span>
                      <span className="text-[10px] text-slate-400">{m.email}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-semibold text-slate-200">{m.planName}</td>
                <td className="p-4">
                  <HealthScore score={m.healthScore} />
                </td>
                <td className="p-4 text-slate-300">{m.assignedTrainer}</td>
                <td className="p-4 font-mono font-bold text-emerald-400">{m.checkinsThisMonth} sessions</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <MembershipStatus status={m.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      onClick={() => onSelectMember(m.id)}
                    >
                      Profile
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

MemberTable.displayName = 'MemberTable';
