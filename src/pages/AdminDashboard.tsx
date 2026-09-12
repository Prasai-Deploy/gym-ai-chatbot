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
      showRightSidebar={false}
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: user?.email || 'owner@striva.app',
        role: 'Gym Owner',
      }}
    >
      {isLoading ? (
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
          <LoadingSkeleton height="40px" width="220px" />
          <LoadingSkeleton height="240px" variant="card" />
          <LoadingSkeleton height="200px" variant="card" />
        </div>
      ) : (
        <GymDashboardLayout
          facilityName="STRIVA Metro Flagship"
          onNavigateMembers={() => navigate('/v3/members')}
          onNavigateTrainers={() => navigate('/v3/trainer')}
          onNavigateAttendance={() => navigate('/v3/attendance')}
          onNavigateBilling={() => navigate('/v3/billing')}
          onNavigateCoach={() => navigate('/v3/coach')}
        />
      )}
    </AppShell>
  );
}
