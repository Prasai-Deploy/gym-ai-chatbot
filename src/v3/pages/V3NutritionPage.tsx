import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer } from '../../design-system/shell/PageContainer';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useNutritionData } from '../../hooks/useStrivaApi';
import { SubscriptionRequired } from '../../design-system/billing/SubscriptionRequired';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';
import { isSubscriptionRequiredError } from '../../utils/errorUtils';
import { NutritionLayout } from '../../design-system/nutrition/NutritionLayout';

export const V3NutritionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, state, loading: isEntitlementLoading } = useEntitlement();
  const nutritionQuery = useNutritionData();

  if (isEntitlementLoading) {
    return (
      <PageContainer
        title="Nutrition"
        subtitle="Nutrition & Metabolism Workspace"
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
    isSubscriptionRequiredError(nutritionQuery.error);

  if (isSubscriptionGate) {
    return (
      <PageContainer
        title="Nutrition"
        subtitle="Nutrition & Metabolism Workspace"
      >
        <SubscriptionRequired featureName="Nutrition & Metabolism" />
      </PageContainer>
    );
  }

  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';

  return (
    <NutritionLayout
      userName={userName}
      onNavigateCoach={(prompt) => navigate('/v3/coach', { state: { initialPrompt: prompt } })}
    />
  );
};
