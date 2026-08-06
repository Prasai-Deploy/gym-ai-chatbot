import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { TrainerWorkspaceLayout } from '../../design-system/trainer/TrainerWorkspaceLayout';
import { useTrainerData } from '../../hooks/useStrivaApi';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

export const V3TrainerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isLoading } = useTrainerData();
  const userName = user?.name || user?.email?.split('@')[0] || 'Coach Elena';

  return (
    <AppShell
      currentPath="/v3/trainer"
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: user?.email || 'trainer@striva.app',
        role: 'Personal Trainer',
      }}
    >
      {isLoading ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton height="140px" variant="card" />
          <LoadingSkeleton height="320px" variant="card" />
        </div>
      ) : (
        <TrainerWorkspaceLayout trainerName={userName} />
      )}
    </AppShell>
  );
};
