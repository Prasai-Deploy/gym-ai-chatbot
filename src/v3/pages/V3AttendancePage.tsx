import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { AttendanceLayout } from '../../design-system/attendance/AttendanceLayout';
import { useAttendanceData } from '../../hooks/useStrivaApi';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

export const V3AttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isLoading } = useAttendanceData();
  const userName = user?.name || user?.email?.split('@')[0] || 'Front Desk Staff';

  return (
    <AppShell
      currentPath="/admin/attendance"
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: user?.email || 'frontdesk@striva.app',
        role: 'Front Desk Lead',
      }}
    >
      {isLoading ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton height="140px" variant="card" />
          <LoadingSkeleton height="320px" variant="card" />
        </div>
      ) : (
        <AttendanceLayout />
      )}
    </AppShell>
  );
};
