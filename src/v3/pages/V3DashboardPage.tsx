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
          <LoadingSkeleton height="40px" width="200px" />
          <LoadingSkeleton height="260px" variant="card" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LoadingSkeleton height="140px" variant="card" />
            <LoadingSkeleton height="140px" variant="card" />
            <LoadingSkeleton height="140px" variant="card" />
          </div>
        </div>
      ) : (
        <DashboardGrid userName={userName} onNavigate={(path) => navigate(path)} />
      )}
    </AppShell>
  );
};
