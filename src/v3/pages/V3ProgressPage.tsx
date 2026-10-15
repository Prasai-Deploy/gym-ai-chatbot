import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer } from '../../design-system/shell/PageContainer';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useProgressData } from '../../hooks/useStrivaApi';
import { SubscriptionRequired } from '../../design-system/billing/SubscriptionRequired';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';
import { isSubscriptionRequiredError } from '../../utils/errorUtils';
import { ProgressLayout } from '../../design-system/progress/ProgressLayout';

export const V3ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, state, loading: isEntitlementLoading } = useEntitlement();
  const progressQuery = useProgressData();

  if (isEntitlementLoading || (hasAccess && progressQuery.isLoading)) {
    return (
      <PageContainer
        title="Progress"
        subtitle="Analytics & Biometrics"
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
    isSubscriptionRequiredError(progressQuery.error);

  if (isSubscriptionGate) {
    return (
      <PageContainer
        title="Progress"
        subtitle="Analytics & Biometrics"
      >
        <SubscriptionRequired featureName="Progress & Biometrics" />
      </PageContainer>
    );
  }

  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';

  return (
    <ProgressLayout
      userName={userName}
      onNavigateCoach={() => navigate('/v3/coach')}
    />
  );
};
