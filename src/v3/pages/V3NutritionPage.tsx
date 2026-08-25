import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { NutritionLayout } from '../../design-system/nutrition/NutritionLayout';
import { useNutritionData } from '../../hooks/useStrivaApi';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

export const V3NutritionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isLoading } = useNutritionData();
  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';

  return (
    <AppShell
      currentPath="/v3/nutrition"
      showRightSidebar={false}
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: user?.email || 'athlete@striva.app',
        role: 'PRO Member',
      }}
    >
      {isLoading ? (
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
          <LoadingSkeleton height="40px" width="180px" />
          <LoadingSkeleton height="260px" variant="card" />
          <LoadingSkeleton height="200px" variant="card" />
        </div>
      ) : (
        <NutritionLayout
          userName={userName}
          onNavigateCoach={(prompt) => {
            navigate('/v3/coach');
          }}
        />
      )}
    </AppShell>
  );
};
