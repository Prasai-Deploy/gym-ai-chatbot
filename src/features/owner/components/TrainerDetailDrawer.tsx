import React, { useState } from 'react';
import { X, UserMinus, UserPlus, Users, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { TrainerDetailView } from '../../../api/trainerApi';
import { useRemoveAssignment } from '../hooks/useOwnerTrainers';

interface TrainerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trainer: TrainerDetailView | null;
  isLoading: boolean;
  onOpenAssignModal: () => void;
  onAssignmentChange?: () => void;
}

export const TrainerDetailDrawer: React.FC<TrainerDetailDrawerProps> = ({
  isOpen,
  onClose,
  trainer,
  isLoading,
  onOpenAssignModal,
  onAssignmentChange,
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const removeMutation = useRemoveAssignment(trainer?.userId);

  if (!isOpen) return null;

  const handleRemove = async (assignmentId: string) => {
    setRemovingId(assignmentId);
    setErrorMsg(null);
    try {
      await removeMutation.mutateAsync(assignmentId);
      if (onAssignmentChange) onAssignmentChange();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to remove assignment';
      setErrorMsg(msg);
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trainer-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end"
    >
      <div className="w-full max-w-md bg-[#0b0f17] border-l border-white/[0.08] flex flex-col h-full shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-[#07090e]">
          <div>
            <h2 id="trainer-drawer-title" className="text-base font-bold text-white tracking-tight">
              Trainer Details & Clients
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Roster profile & member assignments
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading || !trainer ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span className="text-xs">Loading trainer information...</span>
            </div>
          ) : (
            <>
              {/* Profile Card */}
              <div className="bg-[#111622] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-orange-500/30 flex items-center justify-center text-sm font-bold text-orange-400 shrink-0">
                  {trainer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate">{trainer.name}</h3>
                  <p className="text-xs text-slate-400 truncate">{trainer.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {trainer.role}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Active since {formatDate(trainer.joinedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment Stats & Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Assigned Members ({trainer.assignedMemberCount})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Active client caseload managed by this trainer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAssignModal}
                  className="min-h-[44px] px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Assign Member</span>
                </button>
              </div>

              {/* Assigned Members List */}
              <div className="space-y-2.5">
                {trainer.assignedMembers.length === 0 ? (
                  <div className="border border-dashed border-white/[0.1] rounded-2xl p-6 text-center text-slate-400 space-y-1">
                    <Users className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                    <p className="text-xs font-semibold text-slate-200">No members currently assigned</p>
                    <p className="text-[11px] text-slate-400">
                      Click "Assign Member" above to assign an active gym member.
                    </p>
                  </div>
                ) : (
                  trainer.assignedMembers.map((m) => {
                    const isDeleting = removingId === m.assignmentId;
                    return (
                      <div
                        key={m.assignmentId}
                        className="p-3.5 bg-[#111622]/70 border border-white/[0.06] rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>Assigned {formatDate(m.assignedAt)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(m.assignmentId)}
                          disabled={isDeleting || removeMutation.isPending}
                          className="min-h-[44px] px-3.5 py-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          title="Unassign member"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="w-3.5 h-3.5" />
                          )}
                          <span>Unassign</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
