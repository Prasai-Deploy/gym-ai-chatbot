import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../design-system/shell/PageContainer';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useWorkoutData } from '../../hooks/useStrivaApi';
import { SubscriptionRequired } from '../../design-system/billing/SubscriptionRequired';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';
import { isSubscriptionRequiredError } from '../../utils/errorUtils';
import { WorkoutLayout } from '../../design-system/workout/WorkoutLayout';

export const V3WorkoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasAccess, state, loading: isEntitlementLoading } = useEntitlement();
  const workoutQuery = useWorkoutData();

  if (isEntitlementLoading || (hasAccess && workoutQuery.isLoading)) {
    return (
      <PageContainer
        title="Workout"
        subtitle="Training Execution Workspace"
      >
        <div className="w-full max-w-4xl mx-auto py-8 space-y-4">
          <LoadingSkeleton height="60px" variant="card" />
          <LoadingSkeleton height="360px" variant="card" />
        </div>
      </PageContainer>
    );
  }

  const isSubscriptionGate =
    (!hasAccess && (state === 'EXPIRED' || state === 'CANCELLED')) ||
    isSubscriptionRequiredError(workoutQuery.error);

  if (isSubscriptionGate) {
    return (
      <PageContainer
        title="Workout"
        subtitle="Training Execution Workspace"
      >
        <SubscriptionRequired featureName="Workout Execution" />
      </PageContainer>
    );
  }

  const activeSession = workoutQuery.data?.activeSession;
  const latestPlan = workoutQuery.data?.latestPlan;

  const routineTitle = activeSession?.title || latestPlan?.title || latestPlan?.name || 'Upper Body Push & Core';
  const category = latestPlan?.description || 'Hypertrophy • Push Cycle';

  return (
    <WorkoutLayout
      routineTitle={routineTitle}
      category={category}
      onFinishWorkoutComplete={() => navigate('/v3/dashboard')}
      onOpenCoach={() => navigate('/v3/coach')}
    />
  );
};
