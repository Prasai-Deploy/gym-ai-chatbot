import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { OwnerAttentionItem } from '../hooks/useOwnerOverview';

interface OwnerAttentionSectionProps {
  items?: OwnerAttentionItem[];
  isLoading?: boolean;
}

const VALID_OWNER_DESTINATIONS = new Set([
  '/owner/dashboard',
  '/owner/members',
  '/owner/attendance',
  '/owner/trainers',
  '/owner/analytics',
  '/owner/billing',
]);

const severityOrder: Record<string, number> = {
  critical: 1,
  warning: 2,
  info: 3,
};

export const OwnerAttentionSection: React.FC<OwnerAttentionSectionProps> = ({ items = [], isLoading }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <section aria-labelledby="attention-heading" className="w-full">
        <h2 id="attention-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 font-sans mb-3.5">
          Operational Attention
        </h2>
        <div className="h-24 w-full rounded-2xl bg-[#0B0E14] border border-white/[0.06] animate-pulse" />
      </section>
    );
  }

  // Sort items deterministically: Critical (1) -> Warning (2) -> Info (3)
  const sortedItems = [...items].sort((a, b) => {
    const rankA = severityOrder[a.level] || 99;
    const rankB = severityOrder[b.level] || 99;
    return rankA - rankB;
  });

  const hasItems = sortedItems.length > 0;
  const criticalCount = sortedItems.filter((i) => i.level === 'critical').length;

  const handleAction = (path?: string) => {
    if (path && VALID_OWNER_DESTINATIONS.has(path)) {
      navigate(path);
    }
  };

  return (
    <section aria-labelledby="attention-heading" className="w-full">
      <div className="flex items-center justify-between mb-3.5">
        <h2 id="attention-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 font-sans">
          Operational Attention
        </h2>
        {hasItems && (
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                {criticalCount} Critical
              </span>
            )}
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              {sortedItems.length} {sortedItems.length === 1 ? 'Action Item' : 'Action Items'}
            </span>
          </div>
        )}
      </div>

      {!hasItems ? (
        <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#0B0E14] border border-white/[0.06] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight font-sans">
              You're all caught up
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              No operational alerts, staff bottlenecks, or facility issues detected right now.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const isWarning = item.level === 'warning';
            const isCritical = item.level === 'critical';

            const borderCls = isCritical
              ? 'border-red-500/30 bg-red-500/[0.03]'
              : isWarning
              ? 'border-amber-500/30 bg-amber-500/[0.03]'
              : 'border-blue-500/20 bg-blue-500/[0.03]';

            const iconCls = isCritical
              ? 'text-red-400 bg-red-500/10 border-red-500/20'
              : isWarning
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-blue-400 bg-blue-500/10 border-blue-500/20';

            const Icon = isCritical ? AlertCircle : isWarning ? AlertTriangle : Info;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-4.5 rounded-2xl border ${borderCls} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-all`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2 rounded-xl border shrink-0 ${iconCls}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight font-sans">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.actionLabel && item.actionPath && VALID_OWNER_DESTINATIONS.has(item.actionPath) && (
                  <button
                    type="button"
                    onClick={() => handleAction(item.actionPath)}
                    className="self-start sm:self-auto min-h-[44px] text-xs font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 px-4 py-2 rounded-xl shrink-0 flex items-center gap-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

