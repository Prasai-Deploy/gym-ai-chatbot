import React from 'react';
import { UserCheck, Users, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTodayAttendance } from '../hooks/useOwnerAttendance';
import { useOwnerOverview } from '../hooks/useOwnerOverview';
import { AttendanceCheckInSearch } from '../components/AttendanceCheckInSearch';
import { ActiveMembersList } from '../components/ActiveMembersList';
import { AttendanceActivityFeed } from '../components/AttendanceActivityFeed';
import { OwnerHeader } from '../components/OwnerHeader';
import { OwnerNav } from '../components/OwnerNav';

export const OwnerAttendancePage: React.FC = () => {
  const { data: overview } = useOwnerOverview();
  const { data: attendanceData, isLoading, error, refetch, isFetching } = useTodayAttendance();

  const activeSessions = attendanceData?.activeSessions || [];
  const recentActivity = attendanceData?.recentActivity || [];
  const totalCheckInsToday = attendanceData?.totalCheckInsToday ?? 0;
  const currentlyInsideCount = attendanceData?.currentlyInsideCount ?? 0;
  const completedVisits = Math.max(0, totalCheckInsToday - currentlyInsideCount);

  const primaryLocation =
    overview?.locations?.find((l) => l.is_primary)?.name || overview?.locations?.[0]?.name;

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Header with Organization Identity & Live Facility Context */}
      <OwnerHeader
        organizationName={overview?.organization?.name || 'Facility'}
        primaryLocationName={primaryLocation}
        totalLocations={overview?.locations?.length}
        status={overview?.organization?.status}
        currentOrgId={overview?.organization?.id}
      />

      {/* 2. Canonical Owner Navigation */}
      <OwnerNav />

      {/* 3. Main Attendance Desk Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Page Title & Refresh Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                Front Desk
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">Live Turnstile & Member Check-In</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Attendance & Front Desk
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Primary check-in search and real-time floor occupancy.
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
              <span>{isFetching ? 'Refreshing...' : 'Refresh Activity'}</span>
            </button>
          </div>
        </div>

        {/* Operational Stat Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#0b0f17] border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Currently Inside Gym</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{currentlyInsideCount}</span>
                <span className="text-xs text-emerald-400 font-medium">active sessions</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#0b0f17] border border-orange-500/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Check-Ins Today</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{totalCheckInsToday}</span>
                <span className="text-xs text-orange-400 font-medium">visits logged</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#0b0f17] border border-sky-500/20 rounded-2xl p-5 flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-xs font-semibold text-slate-400">Completed Workouts</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{completedVisits}</span>
                <span className="text-xs text-sky-400 font-medium">checked out</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div role="alert" className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold text-xs">Failed to load attendance operations</p>
                <p className="text-xs text-rose-400 mt-0.5">
                  {(error as any)?.message || 'An error occurred while communicating with the attendance service.'}
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

        {/* Core Front Desk Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Member Check-In & Search */}
          <div className="lg:col-span-5 space-y-6">
            <AttendanceCheckInSearch onCheckInSuccess={() => refetch()} />
          </div>

          {/* Right Column: Currently Inside & Recent Activity */}
          <div className="lg:col-span-7 space-y-6">
            <ActiveMembersList
              activeSessions={activeSessions}
              isLoading={isLoading}
              onCheckOutSuccess={() => refetch()}
            />

            <AttendanceActivityFeed
              activity={recentActivity}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
