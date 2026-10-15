import React, { useState } from 'react';
import { Search, Dumbbell, Users, Eye, AlertCircle, RefreshCw, Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { OwnerHeader } from '../components/OwnerHeader';
import { OwnerNav } from '../components/OwnerNav';
import { useOwnerOverview } from '../hooks/useOwnerOverview';
import { useOwnerTrainers, useTrainerDetail } from '../hooks/useOwnerTrainers';
import { useOwnerAnalytics } from '../hooks/useOwnerAnalytics';
import { TrainerDetailDrawer } from '../components/TrainerDetailDrawer';
import { AssignMemberModal } from '../components/AssignMemberModal';
import { TrainerListItem } from '../../../api/trainerApi';

export const OwnerTrainersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainerUserId, setSelectedTrainerUserId] = useState<string | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Load organization header context
  const { data: overview } = useOwnerOverview();

  // Load analytics to see unassigned members count
  const { data: analyticsData } = useOwnerAnalytics('30d');

  // Load trainers roster
  const { data: trainers, isLoading, isError, error, refetch, isFetching } = useOwnerTrainers(searchTerm);

  // Load selected trainer details when drawer is open
  const { data: trainerDetail, isLoading: isLoadingDetail, refetch: refetchDetail } = useTrainerDetail(
    selectedTrainerUserId
  );

  const primaryLocation =
    overview?.locations?.find((l) => l.is_primary)?.name || overview?.locations?.[0]?.name;

  const handleViewTrainer = (trainer: TrainerListItem) => {
    setSelectedTrainerUserId(trainer.userId);
    setIsDetailDrawerOpen(true);
  };

  const trainerList = trainers || [];
  const totalAssignedClients = trainerList.reduce((acc, t) => acc + (t.assignedMemberCount || 0), 0);
  const unassignedCount = analyticsData?.trainers?.unassignedMembers ?? 0;

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Header with Organization Identity & Context */}
      <OwnerHeader
        organizationName={overview?.organization?.name || 'Facility'}
        primaryLocationName={primaryLocation}
        totalLocations={overview?.locations?.length}
        status={overview?.organization?.status}
        currentOrgId={overview?.organization?.id}
      />

      {/* 2. Canonical Owner Navigation */}
      <OwnerNav />

      {/* 3. Main Trainer Management Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Page Title & Refresh Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                Staff Roster
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">Personal Trainer Assignments</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Trainer Roster & Client Assignments
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review trainer caseloads, assign members, and manage coaching coverage.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="min-h-[44px] px-4 py-2 bg-[#0b0f17] hover:bg-slate-800 border border-white/[0.08] text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-orange-500' : ''}`} />
              <span>{isFetching ? 'Refreshing...' : 'Refresh Roster'}</span>
            </button>
          </div>
        </div>

        {/* Operational Stat Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0b0f17] border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Trainers on Staff</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{trainerList.length}</span>
                <span className="text-xs text-indigo-400 font-medium">active trainers</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#0b0f17] border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Active Client Assignments</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{totalAssignedClients}</span>
                <span className="text-xs text-emerald-400 font-medium">members coached</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className={`bg-[#0b0f17] border rounded-2xl p-5 flex items-center justify-between ${
            unassignedCount > 0 ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-white/[0.08]'
          }`}>
            <div>
              <p className="text-xs font-semibold text-slate-400">Unassigned Members</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-extrabold ${unassignedCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {unassignedCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">awaiting trainer</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              unassignedCount > 0
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Unassigned Warning Banner if applicable */}
        {unassignedCount > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {unassignedCount} {unassignedCount === 1 ? 'member is' : 'members are'} currently unassigned
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select a trainer below to assign incoming members and balance coaching loads.
                </p>
              </div>
            </div>
            {trainerList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTrainerUserId(trainerList[0].userId);
                  setIsAssignModalOpen(true);
                }}
                className="min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assign to {trainerList[0].name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-[#0b0f17] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <label htmlFor="trainer-roster-search" className="sr-only">
              Search trainers by name or email
            </label>
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="trainer-roster-search"
              type="search"
              placeholder="Search trainers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111622] border border-white/[0.08] rounded-xl pl-10 pr-4 min-h-[44px] text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors font-sans"
            />
          </div>

          <div className="text-xs font-semibold text-slate-400">
            {trainerList.length} {trainerList.length === 1 ? 'trainer' : 'trainers'} registered
          </div>
        </div>

        {/* Error Alert */}
        {isError && (
          <div role="alert" className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold text-xs">Failed to load trainer roster</p>
                <p className="text-xs text-rose-400 mt-0.5">
                  {(error as any)?.message || 'An unexpected error occurred while fetching trainer data.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Roster Cards Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span>Loading trainer roster...</span>
          </div>
        ) : trainerList.length === 0 ? (
          <div className="border border-dashed border-white/[0.1] rounded-2xl p-12 text-center">
            <Dumbbell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No trainers registered in this organization</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Staff members invited with the 'Trainer' role will appear in this roster.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainerList.map((trainer) => (
              <div
                key={trainer.id}
                className="bg-[#0b0f17] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400 group-hover:scale-105 transition-transform shrink-0">
                      {trainer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{trainer.name}</h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{trainer.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                    {trainer.role}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                    <Users className="w-4 h-4 text-orange-400" />
                    <span>{trainer.assignedMemberCount} assigned {trainer.assignedMemberCount === 1 ? 'member' : 'members'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewTrainer(trainer)}
                    className="min-h-[44px] px-3.5 py-2 bg-white/[0.04] hover:bg-orange-500 hover:text-white border border-white/[0.08] hover:border-orange-500 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Clients</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Trainer Detail Drawer */}
      <TrainerDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        trainer={trainerDetail || null}
        isLoading={isLoadingDetail}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
        onAssignmentChange={() => {
          refetch();
          refetchDetail();
        }}
      />

      {/* Assign Member Modal */}
      {selectedTrainerUserId && (
        <AssignMemberModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          trainerUserId={selectedTrainerUserId}
          trainerName={trainerDetail?.name || 'Selected Trainer'}
          onAssignSuccess={() => {
            refetch();
            refetchDetail();
          }}
        />
      )}
    </div>
  );
};
