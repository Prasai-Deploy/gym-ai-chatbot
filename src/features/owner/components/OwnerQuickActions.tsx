import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, Sparkles, Dumbbell, MapPin, UserCheck, ArrowRight } from 'lucide-react';

interface OwnerQuickActionsProps {
  onScrollToStaff?: () => void;
  onScrollToLocations?: () => void;
}

export const OwnerQuickActions: React.FC<OwnerQuickActionsProps> = ({
  onScrollToStaff,
  onScrollToLocations,
}) => {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="actions-heading" className="w-full space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="actions-heading" className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
            Next Actions & Daily Tasks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Quick links to routine gym operations
          </p>
        </div>
      </div>

      {/* Primary Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Action 1: Front Desk Check-In */}
        <button
          type="button"
          onClick={() => navigate('/owner/attendance')}
          className="p-4 rounded-2xl bg-[#0B0E14] border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all flex items-center justify-between gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors block font-sans truncate">
                Check In Member
              </span>
              <span className="text-xs text-slate-400 block font-sans mt-0.5 truncate">
                Attendance desk & live visits
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 transition-colors" />
        </button>

        {/* Action 2: Member Directory */}
        <button
          type="button"
          onClick={() => navigate('/owner/members')}
          className="p-4 rounded-2xl bg-[#0B0E14] border border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/[0.04] transition-all flex items-center justify-between gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors block font-sans truncate">
                Member Directory
              </span>
              <span className="text-xs text-slate-400 block font-sans mt-0.5 truncate">
                Search profiles & trial dates
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 shrink-0 transition-colors" />
        </button>

        {/* Action 3: Trainer Assignments */}
        <button
          type="button"
          onClick={() => navigate('/owner/trainers')}
          className="p-4 rounded-2xl bg-[#0B0E14] border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/[0.04] transition-all flex items-center justify-between gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors block font-sans truncate">
                Trainer Roster
              </span>
              <span className="text-xs text-slate-400 block font-sans mt-0.5 truncate">
                Client loads & assignments
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
        </button>

        {/* Action 4: Ask TRINETRA Advisor */}
        <button
          type="button"
          onClick={() => navigate('/owner/advisor')}
          className="p-4 rounded-2xl bg-[#0B0E14] border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/[0.04] transition-all flex items-center justify-between gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors block font-sans truncate">
                TRINETRA Advisor
              </span>
              <span className="text-xs text-slate-400 block font-sans mt-0.5 truncate">
                Ask questions about gym trends
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0 transition-colors" />
        </button>
      </div>

      {/* Secondary Operational Shortcuts */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button
          type="button"
          onClick={onScrollToLocations}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span>Branch Locations</span>
        </button>

        <button
          type="button"
          onClick={onScrollToStaff}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Staff Team</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/owner/analytics')}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
        >
          <span>Detailed Trends & Analytics</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </section>
  );
};
