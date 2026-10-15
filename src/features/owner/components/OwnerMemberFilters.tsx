import React from 'react';
import { Search, X, Filter } from '../../../design-system/icons';

interface OwnerMemberFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'active' | 'trial' | 'inactive';
  onStatusChange: (status: 'all' | 'active' | 'trial' | 'inactive') => void;
  roleFilter: string;
  onRoleChange: (role: string) => void;
  totalResults: number;
}

export const OwnerMemberFilters: React.FC<OwnerMemberFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  totalResults,
}) => {
  const statusOptions: Array<{ id: 'all' | 'active' | 'trial' | 'inactive'; label: string }> = [
    { id: 'all', label: 'All Status' },
    { id: 'active', label: 'Active' },
    { id: 'trial', label: 'Trial' },
    { id: 'inactive', label: 'Inactive' },
  ];

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input with accessible label */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="member-search" className="sr-only">
            Search members by name or email
          </label>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="member-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search member name or email..."
            className="w-full pl-10 pr-10 min-h-[44px] rounded-xl bg-[#0B0E14] border border-white/[0.08] text-sm text-white placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role Filter & Counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-[#0B0E14] border border-white/[0.08] text-xs font-sans">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => onRoleChange(e.target.value)}
              aria-label="Filter by role"
              className="bg-transparent text-slate-300 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer py-2"
            >
              <option value="all" className="bg-[#0B0E14] text-white">All Roles</option>
              <option value="Member" className="bg-[#0B0E14] text-white">Members Only</option>
              <option value="Trainer" className="bg-[#0B0E14] text-white">Trainers</option>
              <option value="Gym Manager" className="bg-[#0B0E14] text-white">Gym Managers</option>
              <option value="Front Desk" className="bg-[#0B0E14] text-white">Front Desk</option>
            </select>
          </div>

          <span className="text-xs font-semibold text-slate-400 px-3 py-2 min-h-[44px] flex items-center rounded-xl bg-white/[0.03] border border-white/[0.04]">
            {totalResults} {totalResults === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {statusOptions.map((opt) => {
          const isSelected = statusFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStatusChange(opt.id)}
              className={`px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer ${
                isSelected
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/10'
                  : 'bg-[#0B0E14] text-slate-300 border border-white/[0.06] hover:text-white hover:border-white/[0.12]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
