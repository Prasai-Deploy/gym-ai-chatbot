import React, { useState } from 'react';
import { Users, LogOut, Clock, Loader2, AlertCircle } from 'lucide-react';
import { TodayAttendanceItem } from '../../../api/attendanceApi';
import { useCheckOutMember } from '../hooks/useOwnerAttendance';

interface ActiveMembersListProps {
  activeSessions: TodayAttendanceItem[];
  isLoading: boolean;
  onCheckOutSuccess?: () => void;
}

export const ActiveMembersList: React.FC<ActiveMembersListProps> = ({
  activeSessions,
  isLoading,
  onCheckOutSuccess,
}) => {
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const checkOutMutation = useCheckOutMember();

  const handleCheckOut = async (session: TodayAttendanceItem) => {
    setCheckingOutId(session.id);
    setErrorMsg(null);
    try {
      await checkOutMutation.mutateAsync({
        attendanceId: session.id,
      });
      if (onCheckOutSuccess) onCheckOutSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to check out member.';
      setErrorMsg(msg);
    } finally {
      setCheckingOutId(null);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Currently Inside Facility
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time active member sessions with open check-ins.
          </p>
        </div>
        <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400">
          {activeSessions.length} {activeSessions.length === 1 ? 'member' : 'members'} inside
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          Loading active sessions...
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="border border-dashed border-slate-800/80 rounded-lg p-8 text-center">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No active sessions right now</p>
          <p className="text-xs text-slate-500 mt-1">
            Use the search box above to check in arriving members.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 border border-slate-800/80 rounded-lg overflow-hidden bg-[#111622]/40">
          {activeSessions.map((session) => {
            const isProcessing = checkingOutId === session.id;
            return (
              <div
                key={session.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-orange-400 border border-orange-500/20 shrink-0">
                    {session.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 truncate">
                    <h4 className="text-sm font-semibold text-slate-200 truncate">{session.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        In at {formatTime(session.checkInTime)}
                      </span>
                      {session.locationName && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="truncate text-slate-500">{session.locationName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleCheckOut(session)}
                    disabled={isProcessing || checkOutMutation.isPending}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-200 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        <span>Checking out...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Check Out</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
