import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { DashboardGrid } from '../../design-system/dashboard/DashboardGrid';
import { useDashboardData } from '../../hooks/useStrivaApi';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

export const V3DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isLoading } = useDashboardData();
  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';

  return (
    <AppShell
      currentPath="/v3/dashboard"
      showRightSidebar
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: user?.email || 'athlete@striva.app',
        role: 'PRO Member',
      }}
    >
      {isLoading ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton height="120px" variant="card" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LoadingSkeleton height="240px" variant="card" />
            <LoadingSkeleton height="240px" variant="card" />
          </div>
        </div>
      ) : (
        <DashboardGrid userName={userName} onNavigate={(path) => navigate(path)} />
      )}
    </AppShell>
  );
};
