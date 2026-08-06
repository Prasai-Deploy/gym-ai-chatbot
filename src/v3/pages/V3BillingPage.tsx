import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { BillingLayout } from '../../design-system/billing/BillingLayout';
import { useBillingData } from '../../hooks/useStrivaApi';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

export const V3BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isLoading } = useBillingData();
  const userName = user?.name || user?.email?.split('@')[0] || 'Gym Owner';

  return (
    <AppShell
      currentPath="/admin/billing"
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
        <BillingLayout />
      )}
    </AppShell>
  );
};
