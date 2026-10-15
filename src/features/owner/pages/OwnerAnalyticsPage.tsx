import React, { useState } from 'react';
import { RefreshCw, AlertCircle, BarChart3, TrendingUp, ShieldAlert } from 'lucide-react';
import { OwnerHeader } from '../components/OwnerHeader';
import { OwnerNav } from '../components/OwnerNav';
import { useOwnerOverview } from '../hooks/useOwnerOverview';
import { useOwnerAnalytics } from '../hooks/useOwnerAnalytics';
import { TimeWindow } from '../../../api/analyticsApi';
import { AnalyticsTimeWindowSelector } from '../components/analytics/AnalyticsTimeWindowSelector';
import { MemberAnalyticsCard } from '../components/analytics/MemberAnalyticsCard';
import { AttendanceAnalyticsCard } from '../components/analytics/AttendanceAnalyticsCard';
import { TrainerAnalyticsCard } from '../components/analytics/TrainerAnalyticsCard';
import { RetentionAnalyticsCard } from '../components/analytics/RetentionAnalyticsCard';
import { DeferredFinancialsNotice } from '../components/analytics/DeferredFinancialsNotice';

export const OwnerAnalyticsPage: React.FC = () => {
  const [window, setWindow] = useState<TimeWindow>('30d');

  // Load organization header context
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
  } = useOwnerOverview();

  // Load analytics telemetry
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useOwnerAnalytics(window);

  const primaryLocation =
    overviewData?.locations?.find((l) => l.is_primary)?.name ||
    overviewData?.locations?.[0]?.name;

  const periodText = analyticsData?.period
    ? `${analyticsData.period.from} to ${analyticsData.period.to} (${analyticsData.period.days} days)`
    : undefined;

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Header with Organization Identity */}
      <OwnerHeader
        organizationName={overviewData?.organization?.name || 'Facility'}
        primaryLocationName={primaryLocation}
        totalLocations={overviewData?.locations?.length}
        status={overviewData?.organization?.status}
        currentOrgId={overviewData?.organization?.id}
      />

      {/* 2. Canonical Owner Navigation */}
      <OwnerNav />

      {/* 3. Main Analytics Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
        {/* Page Title & Refresh Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                Gym Trends
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">Activity & Member Reports</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Gym Analytics & Trends
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="min-h-[44px] px-4 py-2 bg-[#0a0d14] hover:bg-slate-800 border border-white/[0.06] text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-orange-500' : ''}`} />
              <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Bounded Time Window Selector */}
        <AnalyticsTimeWindowSelector
          selectedWindow={window}
          onChange={setWindow}
          periodText={periodText}
          disabled={isFetching}
        />

        {/* Error State */}
        {isError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs font-bold block">
                  Failed to load gym analytics
                </span>
                <span className="text-xs text-red-300/80 block">
                  {(error as any)?.message ||
                    'Database query error or unauthorized organization tenant context.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isAnalyticsLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-44 bg-[#0a0d14] rounded-2xl border border-white/[0.06]" />
            <div className="h-64 bg-[#0a0d14] rounded-2xl border border-white/[0.06]" />
            <div className="h-64 bg-[#0a0d14] rounded-2xl border border-white/[0.06]" />
          </div>
        )}

        {/* Loaded Analytics Telemetry */}
        {!isAnalyticsLoading && !isError && analyticsData && (
          <div className="space-y-7">
            {/* 1. Member Growth & Acquisition */}
            <MemberAnalyticsCard data={analyticsData.members} />

            {/* 2. Facility Attendance & Peak Floor Traffic */}
            <AttendanceAnalyticsCard data={analyticsData.attendance} />

            {/* 3. Retention & Return Rate */}
            <RetentionAnalyticsCard data={analyticsData.retention} />

            {/* 4. Trainer Workload & Client Assignments */}
            <TrainerAnalyticsCard data={analyticsData.trainers} />

            {/* 5. Deferred B2B Financials Notice */}
            <DeferredFinancialsNotice notice={analyticsData.financials} />
          </div>
        )}
      </main>
    </div>
  );
};
