import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../design-system/shell/AppShell';
import { GymDashboardLayout } from '../design-system/owner/GymDashboardLayout';
import { useOwnerData } from '../hooks/useStrivaApi';
import { LoadingSkeleton } from '../design-system/components/LoadingSkeleton';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isLoading } = useOwnerData();
  const userName = user?.name || user?.email?.split('@')[0] || 'Gym Owner';

  return (
    <AppShell
      currentPath="/admin"
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: user?.email || 'owner@striva.app',
        role: 'Gym Owner',
      }}
    >
      {isLoading ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton height="140px" variant="card" />
          <LoadingSkeleton height="320px" variant="card" />
        </div>
      ) : (
        <GymDashboardLayout facilityName="STRIVA Metro Flagship" />
      )}
    </AppShell>
  );
}
