import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEntitlement } from '../hooks/useEntitlement';
import { AppShell } from '../design-system/shell/AppShell';

export const MemberLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tier, state, isTrial, isDemo } = useEntitlement();

  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';
  const email = user?.email || 'athlete@striva.app';
  const role = user?.role || (isDemo ? 'Demo User' : isTrial ? 'Trial Athlete' : state === 'ACTIVE' ? `${tier.toUpperCase()} Member` : state === 'EXPIRED' ? 'Trial Expired' : 'Member');

  return (
    <AppShell
      currentPath={location.pathname}
      showRightSidebar={false}
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: email,
        role: role,
      }}
    >
      <Outlet />
    </AppShell>
  );
};
