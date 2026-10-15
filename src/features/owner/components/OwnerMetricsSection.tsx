import React from 'react';
import { Building2, Users2, MapPin, ShieldCheck, Mail } from 'lucide-react';
import { OwnerOverviewData } from '../hooks/useOwnerOverview';

interface OwnerMetricsSectionProps {
  locations?: OwnerOverviewData['locations'];
  staff?: OwnerOverviewData['staff'];
  isLoading?: boolean;
  locationsRef?: React.RefObject<HTMLDivElement | null>;
  staffRef?: React.RefObject<HTMLDivElement | null>;
}

export const OwnerMetricsSection: React.FC<OwnerMetricsSectionProps> = ({
  locations = [],
  staff = [],
  isLoading,
  locationsRef,
  staffRef,
}) => {
  return (
    <section aria-labelledby="supporting-heading" className="w-full">
      <div className="flex items-center justify-between mb-3.5">
        <h2 id="supporting-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 font-sans">
          Supporting Operational Entities
        </h2>
        <span className="text-[11px] text-slate-400 font-sans">
          Active tenant records
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Facility Locations */}
        <div
          ref={locationsRef as any}
          className="p-5 rounded-2xl bg-[#0B0E14] border border-white/[0.08] flex flex-col"
        >
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight font-sans">
                Facility Locations ({locations.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Real Data
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse" />
              <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse" />
            </div>
          ) : locations.length === 0 ? (
            <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
              <MapPin className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-xs font-semibold text-slate-300">No physical locations configured</span>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                Your gym operates with organization-wide default scope. Add physical locations in Settings.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block truncate font-sans">
                        {loc.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate font-sans">
                        {[loc.address, loc.city, loc.state].filter(Boolean).join(', ') || 'Address not configured'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {loc.is_primary && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                        Primary
                      </span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active location" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Staff Roster */}
        <div
          ref={staffRef as any}
          className="p-5 rounded-2xl bg-[#0B0E14] border border-white/[0.08] flex flex-col"
        >
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Users2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight font-sans">
                Staff Roster ({staff.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Canonical DB
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse" />
              <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse" />
            </div>
          ) : staff.length === 0 ? (
            <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-xs font-semibold text-slate-300">No staff members enrolled yet</span>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                Invite managers, personal trainers, or front desk operators to manage this club.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {staff.slice(0, 5).map((member) => {
                const name = member.profiles?.full_name || member.profiles?.email?.split('@')[0] || 'Staff Member';
                const email = member.profiles?.email;

                return (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate font-sans">
                          {name}
                        </span>
                        {email && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate font-sans">
                            <Mail className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{email}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08] uppercase tracking-wider">
                        {member.role}
                      </span>
                    </div>
                  </div>
                );
              })}

              {staff.length > 5 && (
                <div className="text-center pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">
                    +{staff.length - 5} more staff members registered
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
