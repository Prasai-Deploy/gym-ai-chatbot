import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardGrid } from '../../design-system/dashboard/DashboardGrid';
import { useMemberHomeData } from '../../hooks/useStrivaApi';
import { useEntitlement } from '../../hooks/useEntitlement';
import { SubscriptionRequired } from '../../design-system/billing/SubscriptionRequired';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { AlertCircle, RefreshCw } from '../../design-system/icons';
import { isSubscriptionRequiredError } from '../../utils/errorUtils';

import { OnboardingPrompt } from '../../design-system/onboarding/OnboardingPrompt';

export const V3DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, state, loading: isEntitlementLoading } = useEntitlement();
  const {
    userData,
    workoutData,
    nutritionData,
    progressData,
    logWater,
    isLoggingWater,
    isLoading,
    isError,
    error,
    refetchAll,
  } = useMemberHomeData();

  const userName = user?.name || userData?.name || user?.email?.split('@')[0];
  const isOnboardingIncomplete = !userData?.fitness?.primary_goal;

  // Loading State
  if (isEntitlementLoading || (hasAccess && isLoading)) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <LoadingSkeleton height="16px" width="120px" />
          <LoadingSkeleton height="36px" width="260px" />
          <LoadingSkeleton height="16px" width="180px" />
        </div>

        {/* Level 1 Hero Skeleton */}
        <LoadingSkeleton height="220px" variant="card" />

        {/* Level 2 Plan Skeleton */}
        <LoadingSkeleton height="80px" variant="card" />

        {/* Level 3 Status Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LoadingSkeleton height="120px" variant="card" />
          <LoadingSkeleton height="120px" variant="card" />
        </div>
      </div>
    );
  }

  // Subscription Required Gate
  if (!hasAccess && (state === 'EXPIRED' || state === 'CANCELLED')) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <SubscriptionRequired featureName="STRIVA Command Center" />
      </div>
    );
  }

  if (isError && isSubscriptionRequiredError(error)) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <SubscriptionRequired featureName="STRIVA Command Center" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Proportional Actionable Error Banner if transient error occurs */}
      {isError && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-3">
          <div className="p-3.5 rounded-2xl bg-[#181C28] border border-orange-500/25 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white font-sans truncate">
                  Command center sync notice
                </span>
                <span className="text-[11px] text-slate-400 font-sans truncate">
                  Some background metrics could not refresh. Tap Retry to reconnect.
                </span>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={refetchAll} className="gap-1.5 shrink-0 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}

      {isOnboardingIncomplete && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-2">
          <OnboardingPrompt
            onComplete={refetchAll}
            onNavigateProfile={() => navigate('/v3/profile')}
          />
        </div>
      )}

      <DashboardGrid
        userName={userName}
        workoutData={workoutData}
        nutritionData={nutritionData}
        progressData={progressData}
        onLogWater={(amount) => logWater(amount)}
        isLoggingWater={isLoggingWater}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
};
