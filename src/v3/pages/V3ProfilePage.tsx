import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { ProfileLayout } from '../../design-system/profile/ProfileLayout';

export const V3ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';
  const email = user?.email || 'athlete@striva.app';

  return (
    <AppShell
      currentPath="/v3/profile"
      showRightSidebar={false}
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: email,
        role: 'PRO Member',
      }}
    >
      <ProfileLayout
        userName={userName}
        email={email}
        role="PRO Member"
        avatarUrl={user?.avatar}
        onNavigateBilling={() => navigate('/v3/billing')}
        onLogout={() => logout?.()}
      />
    </AppShell>
  );
};
