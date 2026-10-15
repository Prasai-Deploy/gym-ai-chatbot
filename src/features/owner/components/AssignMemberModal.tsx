import React, { useState } from 'react';
import { X, UserPlus, Search, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { organizationApi, MemberListItem } from '../../../api/organizationApi';
import { useAssignMember } from '../hooks/useOwnerTrainers';

interface AssignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerUserId: string;
  trainerName: string;
  onAssignSuccess?: () => void;
}

export const AssignMemberModal: React.FC<AssignMemberModalProps> = ({
  isOpen,
  onClose,
  trainerUserId,
  trainerName,
  onAssignSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberListItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search members from canonical organization API (status: active or trial)
  const { data: memberData, isLoading: isSearching } = useQuery({
    queryKey: ['owner', 'members', 'search-assign', searchTerm],
    queryFn: () => organizationApi.getCurrentMembers({ search: searchTerm, limit: 8, status: 'all' }),
    enabled: isOpen && searchTerm.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  const assignMutation = useAssignMember();

  if (!isOpen) return null;

  const members = memberData?.data || [];

  const handleAssign = async () => {
    if (!selectedMember) return;
    setErrorMsg(null);

    try {
      await assignMutation.mutateAsync({
        trainerUserId,
        memberUserId: selectedMember.userId,
      });

      if (onAssignSuccess) onAssignSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to assign member to trainer';
      setErrorMsg(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-[#0b0f17] border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#07090e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="assign-modal-title" className="text-base font-bold text-white">
                Assign Member to Trainer
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Assigning to <span className="text-white font-semibold">{trainerName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Member Search */}
          <div className="space-y-1.5">
            <label htmlFor="member-assign-search" className="text-xs font-semibold text-slate-300">
              Search Member
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input
                id="member-assign-search"
                type="search"
                placeholder="Type member name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full bg-[#111622] border border-white/[0.08] rounded-xl pl-10 pr-4 min-h-[44px] text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors font-sans"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Results list */}
          {searchTerm.trim().length >= 2 && (
            <div className="border border-white/[0.08] rounded-xl overflow-hidden divide-y divide-white/[0.06] max-h-56 overflow-y-auto bg-[#111622]/60">
              {members.length === 0 && !isSearching ? (
                <div className="p-4 text-xs text-slate-400 text-center">
                  No matching members found in organization.
                </div>
              ) : (
                members.map((m) => {
                  const isSelected = selectedMember?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(m);
                        setErrorMsg(null);
                      }}
                      className={`w-full text-left px-4 py-3 min-h-[44px] flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/10 border-l-2 border-orange-500'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                        {m.status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Selected Member Preview */}
          {selectedMember && (
            <div className="p-4 bg-[#131926] border border-orange-500/30 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
                  Selected Member
                </span>
                <p className="text-sm font-bold text-white truncate mt-0.5">{selectedMember.name}</p>
                <p className="text-xs text-slate-400 truncate">{selectedMember.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#07090e] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedMember || assignMutation.isPending}
            className="min-h-[44px] px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              'Confirm Assignment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
