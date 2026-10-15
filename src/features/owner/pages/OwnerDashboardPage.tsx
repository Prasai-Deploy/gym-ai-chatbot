import React, { useRef } from 'react';
import { useOwnerOverview } from '../hooks/useOwnerOverview';
import { OwnerHeader } from '../components/OwnerHeader';
import { OwnerNav } from '../components/OwnerNav';
import { OwnerStateSection } from '../components/OwnerStateSection';
import { OwnerAttentionSection } from '../components/OwnerAttentionSection';
import { OwnerQuickActions } from '../components/OwnerQuickActions';
import { OwnerMetricsSection } from '../components/OwnerMetricsSection';
import { AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';

export const OwnerDashboardPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useOwnerOverview();

  const locationsRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);

  const scrollToStaff = () => {
    staffRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToLocations = () => {
    locationsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const primaryLocation = data?.locations?.find((l) => l.is_primary)?.name || data?.locations?.[0]?.name;

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Header with Organization Identity & Location Scope */}
      <OwnerHeader
        organizationName={data?.organization?.name || ''}
        primaryLocationName={primaryLocation}
        totalLocations={data?.locations?.length}
        status={data?.organization?.status}
        currentOrgId={data?.organization?.id}
      />

      {/* 2. Canonical Owner Navigation */}
      <OwnerNav />

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
        {/* Error State */}
        {isError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs font-bold block">
                  Failed to load gym data
                </span>
                <span className="text-xs text-red-300/80 block">
                  {(error as any)?.message || 'Database query failed or unauthorized organization context.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3.5 py-2 min-h-[44px] rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Level 1: Actionable Attention Items & Operational Alerts (Important Issues First) */}
        <OwnerAttentionSection items={data?.attentionItems} isLoading={isLoading} />

        {/* Level 2: Next Actions & Daily Operations */}
        <OwnerQuickActions
          onScrollToStaff={scrollToStaff}
          onScrollToLocations={scrollToLocations}
        />

        {/* Level 3: Summary of Gym Activity (Small number of meaningful metrics) */}
        <OwnerStateSection metrics={data?.metrics} isLoading={isLoading} />

        {/* Level 4: Supporting Operational Entities */}
        <OwnerMetricsSection
          locations={data?.locations}
          staff={data?.staff}
          isLoading={isLoading}
          locationsRef={locationsRef}
          staffRef={staffRef}
        />

        {/* Level 5: Analytics Notice */}
        <footer className="pt-4 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-orange-400/80" />
            <span>Detailed retention metrics and trends are available in Analytics.</span>
          </div>
          <span className="text-[11px] font-mono">
            STRIVA V2 · Gym Owner OS
          </span>
        </footer>
      </main>
    </div>
  );
};
