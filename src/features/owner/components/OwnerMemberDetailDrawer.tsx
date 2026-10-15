import React from 'react';
import { Drawer } from '../../../design-system/components/Drawer';
import { Badge } from '../../../design-system/components/Badge';
import { LoadingSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { useOwnerMemberDetail } from '../hooks/useOwnerMembers';
import { Shield, Calendar, User, Dumbbell, Activity } from '../../../design-system/icons';

interface OwnerMemberDetailDrawerProps {
  memberId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerMemberDetailDrawer: React.FC<OwnerMemberDetailDrawerProps> = ({
  memberId,
  isOpen,
  onClose,
}) => {
  const { data: member, isLoading, error } = useOwnerMemberDetail(isOpen ? memberId : null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDaysRemaining = (endsAt: string | null) => {
    if (!endsAt) return null;
    const diffMs = new Date(endsAt).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Member Profile"
      className="bg-[#0B0E14] border-white/[0.08]"
    >
      {isLoading ? (
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex items-center gap-4">
            <LoadingSkeleton variant="circular" width={56} height={56} />
            <div className="flex flex-col gap-2 flex-1">
              <LoadingSkeleton variant="text" width="60%" />
              <LoadingSkeleton variant="text" width="40%" />
            </div>
          </div>
          <LoadingSkeleton variant="card" height={100} />
          <LoadingSkeleton variant="card" height={100} />
        </div>
      ) : error || !member ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
          <p className="text-sm font-semibold text-white">Member information not available</p>
          <p className="text-xs">
            {error ? 'Failed to retrieve member details. Please verify your permissions.' : 'Member record could not be found.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 font-sans">
          {/* Identity Header */}
          <div className="flex items-start gap-4 pb-5 border-b border-white/[0.06]">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="w-14 h-14 rounded-2xl object-cover border border-white/[0.1]"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/[0.1] flex items-center justify-center text-base font-bold text-white">
                {getInitials(member.name)}
              </div>
            )}
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                {member.name}
              </h2>
              <p className="text-xs text-slate-400 truncate">{member.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant={
                    member.role === 'Organization Owner'
                      ? 'primary'
                      : member.role === 'Gym Manager'
                      ? 'warning'
                      : member.role === 'Trainer'
                      ? 'ai'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {member.role}
                </Badge>
                <Badge
                  variant={
                    member.status === 'active'
                      ? 'success'
                      : member.status === 'trial'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {member.status === 'trial' ? 'Trial' : member.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Section 1: Membership & Access */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Membership State
            </span>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Membership Tier</span>
                <span className="font-semibold text-white uppercase">
                  {member.membership.tier ? `${member.membership.tier} Tier` : 'Standard Membership'}
                </span>
              </div>
              {member.membership.isTrial && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Trial Period</span>
                  <span className="font-semibold text-amber-400">
                    {member.membership.trialEndsAt
                      ? `${getDaysRemaining(member.membership.trialEndsAt)} days left`
                      : 'Active 14-day trial'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Member Since</span>
                <span className="font-semibold text-white">
                  {new Date(member.joinedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {member.locationName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Branch</span>
                  <span className="font-semibold text-white">{member.locationName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Fitness Summary */}
          {member.fitnessSummary && (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-orange-400" />
                Fitness Overview
              </span>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3 text-xs">
                {member.fitnessSummary.level && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Experience Level</span>
                    <span className="font-semibold text-white capitalize">
                      {member.fitnessSummary.level}
                    </span>
                  </div>
                )}
                {member.fitnessSummary.primaryGoal && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Primary Goal</span>
                    <span className="font-semibold text-white capitalize">
                      {member.fitnessSummary.primaryGoal}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Facility Attendance Activity */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Facility Activity
            </span>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Check-ins Logged</span>
                <span className="font-semibold text-white">
                  {member.activitySummary.totalCheckIns} {member.activitySummary.totalCheckIns === 1 ? 'visit' : 'visits'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Facility Visit</span>
                <span className="font-semibold text-white">
                  {member.activitySummary.lastCheckInAt
                    ? new Date(member.activitySummary.lastCheckInAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'No recorded visits yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Privacy Boundary Reassurance */}
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.04] flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>STRIVA Privacy Boundary:</strong> Passwords, payment secrets, and private TRINETRA AI conversations are strictly protected and never accessible to facility staff.
            </span>
          </div>
        </div>
      )}
    </Drawer>
  );
};
