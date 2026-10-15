import React, { useState } from 'react';
import { Search, UserCheck, AlertCircle, Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '../../../api/attendanceApi';
import { useCheckInMember } from '../hooks/useOwnerAttendance';

interface AttendanceCheckInSearchProps {
  onCheckInSuccess?: () => void;
}

export const AttendanceCheckInSearch: React.FC<AttendanceCheckInSearchProps> = ({ onCheckInSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<{ id: string; userId: string; name: string; email: string; avatarUrl: string | null; status: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Search members from canonical attendance API
  const { data: memberResults, isLoading: isSearching } = useQuery({
    queryKey: ['owner', 'members', 'search-attendance', searchTerm],
    queryFn: () => attendanceApi.searchMembers(searchTerm, 6),
    enabled: searchTerm.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  const checkInMutation = useCheckInMember();

  const handleSelectMember = (member: { id: string; userId: string; name: string; email: string; avatarUrl: string | null; status: string }) => {
    setSelectedMember(member);
    setFeedback(null);
  };

  const handlePerformCheckIn = async (memberToLog: { id: string; userId: string; name: string; email: string }) => {
    setFeedback(null);
    try {
      await checkInMutation.mutateAsync({
        userId: memberToLog.userId,
      });

      setFeedback({
        type: 'success',
        message: `Successfully checked in ${memberToLog.name}.`,
      });
      setSelectedMember(null);
      setSearchTerm('');
      if (onCheckInSuccess) onCheckInSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Check-in failed. Please verify member status.';
      setFeedback({
        type: 'error',
        message: msg,
      });
    }
  };

  const members = memberResults || [];

  return (
    <div className="bg-[#0b0f17] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-orange-400" />
          Front Desk Member Check-In
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Search arriving members by name or email to record a check-in visit.
        </p>
      </div>

      {/* Search Input with 48px touch target */}
      <div className="relative">
        <label htmlFor="member-search-input" className="sr-only">
          Search Member by name or email
        </label>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        <input
          id="member-search-input"
          type="search"
          placeholder="Search arriving member by name or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (feedback?.type === 'error') setFeedback(null);
          }}
          className="w-full bg-[#111622] border border-white/[0.08] rounded-xl pl-11 pr-4 min-h-[48px] text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-all font-sans"
          autoComplete="off"
        />
      </div>

      {/* Search Results Dropdown/List with 1-Tap Check-In */}
      {searchTerm.trim().length >= 2 && (
        <div className="border border-white/[0.08] bg-[#111622] rounded-xl overflow-hidden divide-y divide-white/[0.06] max-h-72 overflow-y-auto">
          {members.length === 0 && !isSearching && (
            <div className="p-4 text-xs text-slate-400 text-center">
              No matching members found in organization.
            </div>
          )}
          {members.map((m) => {
            const isSelected = selectedMember?.id === m.id;
            return (
              <div
                key={m.id}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isSelected ? 'bg-orange-500/10' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  onClick={() => handleSelectMember(m)}
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                      m.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : m.status === 'trial'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {m.status}
                  </span>

                  {/* 1-Tap Direct Check-In Button */}
                  <button
                    type="button"
                    onClick={() => handlePerformCheckIn(m)}
                    disabled={checkInMutation.isPending}
                    className="min-h-[44px] px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Check In</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Member Confirmation Card */}
      {selectedMember && (
        <div className="bg-[#131926] border border-orange-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
              Selected Member
            </span>
            <h4 className="text-sm font-bold text-white truncate mt-0.5">{selectedMember.name}</h4>
            <p className="text-xs text-slate-400 truncate">{selectedMember.email}</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
              className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handlePerformCheckIn(selectedMember)}
              disabled={checkInMutation.isPending}
              className="min-h-[44px] px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
            >
              {checkInMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking In...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Confirm Check-In</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
            feedback.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
