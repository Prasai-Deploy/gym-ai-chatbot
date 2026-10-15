import React, { useState } from 'react';
import { OwnerHeader } from '../components/OwnerHeader';
import { OwnerNav } from '../components/OwnerNav';
import { OwnerMemberFilters } from '../components/OwnerMemberFilters';
import { OwnerMemberTable } from '../components/OwnerMemberTable';
import { OwnerMemberPagination } from '../components/OwnerMemberPagination';
import { OwnerMemberDetailDrawer } from '../components/OwnerMemberDetailDrawer';
import { useOwnerMembers } from '../hooks/useOwnerMembers';
import { useOwnerOverview } from '../hooks/useOwnerOverview';
import { EmptyState } from '../../../design-system/components/EmptyState';
import { Users, AlertCircle, RefreshCw } from '../../../design-system/icons';

export const OwnerMembersPage: React.FC = () => {
  const { data: overview } = useOwnerOverview();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const primaryLocation =
    overview?.locations?.find((l) => l.is_primary)?.name || overview?.locations?.[0]?.name;

  const { data, isLoading, isError, error, refetch } = useOwnerMembers({
    page,
    limit,
    search: searchQuery,
    status: statusFilter,
    role: roleFilter,
  });

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1); // reset to page 1 on new search
  };

  const handleStatusChange = (status: 'all' | 'active' | 'trial' | 'inactive') => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleRoleChange = (role: string) => {
    setRoleFilter(role);
    setPage(1);
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedMemberId(null);
  };

  const members = data?.members || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit, totalPages: 0 };

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Level 0: Gym Owner Master Header & Identity */}
      <OwnerHeader
        organizationName={overview?.organization?.name || ''}
        primaryLocationName={primaryLocation}
        totalLocations={overview?.locations?.length}
        status={overview?.organization?.status}
        currentOrgId={overview?.organization?.id}
      />

      {/* Navigation Bar */}
      <OwnerNav />

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Member Directory
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative organization member roster, trial states, and facility attendance logs.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <OwnerMemberFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          roleFilter={roleFilter}
          onRoleChange={handleRoleChange}
          totalResults={pagination.total}
        />

        {/* Content State: Error / Empty / Table */}
        {isError ? (
          <div className="p-6 rounded-2xl bg-red-500/[0.04] border border-red-500/20 flex flex-col items-center justify-center text-center gap-3 my-4">
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-white">Unable to Load Member Directory</h2>
              <p className="text-xs text-slate-400 max-w-sm">
                {(error as any)?.message || 'A network or authorization error occurred while retrieving members.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/[0.1] transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : !isLoading && members.length === 0 ? (
          searchQuery || statusFilter !== 'all' || roleFilter !== 'all' ? (
            <EmptyState
              title="No Matching Members"
              description={`No members match your current query "${searchQuery || statusFilter}". Try adjusting your filters.`}
              icon={<Users className="w-8 h-8 text-slate-500" />}
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRoleFilter('all');
                setPage(1);
              }}
            />
          ) : (
            <EmptyState
              title="No Members Yet"
              description="Your facility roster is currently empty. Invite members or staff from the overview dashboard."
              icon={<Users className="w-8 h-8 text-slate-500" />}
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            <OwnerMemberTable
              members={members}
              onSelectMember={handleSelectMember}
              isLoading={isLoading}
            />

            {!isLoading && (
              <OwnerMemberPagination
                page={page}
                limit={limit}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </main>

      {/* Member Details Drawer */}
      <OwnerMemberDetailDrawer
        memberId={selectedMemberId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};
