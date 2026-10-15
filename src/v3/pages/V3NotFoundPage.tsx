import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../design-system/shell/PageContainer';
import { EmptyState } from '../../design-system/components/EmptyState';
import { AlertCircle } from '../../design-system/icons';

export const V3NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer
      title="Page Not Found"
      subtitle="The requested member view does not exist."
    >
      <div className="py-16 flex items-center justify-center">
        <EmptyState
          title="404 — Section Not Found"
          description="The destination you requested is unavailable or has been moved."
          icon={<AlertCircle className="w-10 h-10 text-orange-400" />}
          actionLabel="Return to Home"
          onAction={() => navigate('/v3/dashboard')}
        />
      </div>
    </PageContainer>
  );
};
