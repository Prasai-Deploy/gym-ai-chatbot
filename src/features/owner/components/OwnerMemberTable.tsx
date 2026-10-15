import React from 'react';
import { MemberListItem } from '../../../api/organizationApi';
import { Badge } from '../../../design-system/components/Badge';
import { LoadingSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { ChevronRight } from '../../../design-system/icons';

interface OwnerMemberTableProps {
  members: MemberListItem[];
  onSelectMember: (memberId: string) => void;
  isLoading: boolean;
}

export const OwnerMemberTable: React.FC<OwnerMemberTableProps> = ({
  members,
  onSelectMember,
  isLoading,
}) => {
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

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#0B0E14] border border-white/[0.04] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <LoadingSkeleton variant="circular" width={40} height={40} />
              <div className="flex flex-col gap-1.5">
                <LoadingSkeleton variant="text" width={140} />
                <LoadingSkeleton variant="text" width={100} />
              </div>
            </div>
            <LoadingSkeleton variant="rectangular" width={80} height={24} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* DESKTOP TABLE VIEW (>= 768px) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0B0E14]">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4">Member</th>
              <th scope="col" className="py-3 px-4">Role</th>
              <th scope="col" className="py-3 px-4">Membership State</th>
              <th scope="col" className="py-3 px-4">Joined</th>
              <th scope="col" className="py-3 px-4">Last Facility Visit</th>
              <th scope="col" className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-xs">
            {members.map((member) => {
              const daysLeft = member.isTrial ? getDaysRemaining(member.trialEndsAt) : null;
              return (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member.id)}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  {/* Member identity */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-9 h-9 rounded-xl object-cover border border-white/[0.08]"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-bold text-slate-300 text-xs">
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-white group-hover:text-orange-400 transition-colors truncate">
                          {member.name}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
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
                  </td>

                  {/* Status & Trial */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
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
                      {member.isTrial && daysLeft !== null && (
                        <span className="text-[10px] text-amber-400/90 font-medium">
                          ({daysLeft}d left)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Joined Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                    {new Date(member.joinedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Last Activity */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                    {member.lastActivityAt ? (
                      new Date(member.lastActivityAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    ) : (
                      <span className="text-slate-500 italic">No visits yet</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember(member.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-orange-500/10 hover:text-orange-400 text-slate-200 border border-white/[0.08] hover:border-orange-500/30 transition-all text-xs sm:text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                    >
                      <span>Inspect Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS VIEW (< 768px) */}
      <div className="md:hidden flex flex-col gap-3">
        {members.map((member) => {
          const daysLeft = member.isTrial ? getDaysRemaining(member.trialEndsAt) : null;
          return (
            <div
              key={member.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectMember(member.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectMember(member.id);
                }
              }}
              className="p-4 rounded-2xl bg-[#0B0E14] border border-white/[0.08] flex flex-col gap-3.5 active:scale-[0.99] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-11 h-11 rounded-xl object-cover border border-white/[0.08]"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-bold text-slate-200 text-sm shrink-0">
                      {getInitials(member.name)}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm sm:text-base font-bold text-white truncate">
                      {member.name}
                    </span>
                    <span className="text-xs text-slate-400 truncate mt-0.5">
                      {member.email}
                    </span>
                  </div>
                </div>

                <div className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400">
                  <ChevronRight className="w-5 h-5 shrink-0" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-xs text-slate-300">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant={member.role === 'Member' ? 'neutral' : 'primary'} size="sm">
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
                  {member.isTrial && daysLeft !== null && (
                    <span className="text-xs text-amber-400 font-semibold">
                      {daysLeft}d left
                    </span>
                  )}
                </div>

                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {member.lastActivityAt
                    ? `Visited ${new Date(member.lastActivityAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : 'No visits'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
