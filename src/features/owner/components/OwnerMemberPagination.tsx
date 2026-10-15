import React from 'react';
import { ChevronLeft, ChevronRight } from '../../../design-system/icons';

interface OwnerMemberPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export const OwnerMemberPagination: React.FC<OwnerMemberPaginationProps> = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}) => {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.06] w-full text-xs font-sans">
      <div className="text-slate-400 font-medium">
        Showing <span className="text-white font-semibold">{start}</span> to{' '}
        <span className="text-white font-semibold">{end}</span> of{' '}
        <span className="text-white font-semibold">{total}</span> members
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0B0E14] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.15] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="px-2.5 py-1 text-slate-400 font-semibold">
          Page {page} of {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0B0E14] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.15] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
