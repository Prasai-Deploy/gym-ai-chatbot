import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { PageContainer } from '../../design-system/shell/PageContainer';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Avatar } from '../../design-system/components/Avatar';
import { Badge } from '../../design-system/components/Badge';
import { LogOut, Shield, Settings, Award, TrendingUp, Bell } from 'lucide-react';

export const V3ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';

  return (
    <AppShell
      currentPath="/v3/profile"
      onNavigate={(path) => navigate(path)}
      onLogout={logout}
      user={{
        name: userName,
        email: user?.email || 'athlete@striva.app',
        avatarUrl: user?.avatar,
        role: 'PRO Member',
      }}
    >
      <PageContainer maxWidth="md" className="gap-5">
        <section className="glass-panel rounded-[30px] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar src={user?.avatar} name={userName} size="xl" status="online" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold text-white tracking-tight truncate">{userName}</h1>
              <Badge variant="primary" size="sm">Pro member</Badge>
            </div>
            <p className="text-sm text-slate-400 truncate">{user?.email || 'athlete@striva.app'}</p>
            <p className="text-xs text-slate-400 mt-2 max-w-xl">Your fitness targets, privacy controls, and membership preferences live here.</p>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
            Edit profile
          </Button>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-bold text-white">Daily targets</h2>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Editable</span>
            </div>
            <dl className="divide-y divide-white/10 text-sm">
              <div className="flex justify-between gap-4 py-3 first:pt-0">
                <dt className="text-slate-400">Calories</dt>
                <dd className="font-semibold text-white">2,000 kcal</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-400">Protein</dt>
                <dd className="font-semibold text-white">160 g</dd>
              </div>
              <div className="flex justify-between gap-4 py-3 last:pb-0">
                <dt className="text-slate-400">Hydration</dt>
                <dd className="font-semibold text-white">2.5 L</dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-5">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Highlights</h2>
            </div>
            <dl className="divide-y divide-white/10 text-sm">
              <div className="flex justify-between gap-4 py-3 first:pt-0">
                <dt className="text-slate-400">Active streak</dt>
                <dd className="font-semibold text-amber-400">7 days</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-400">Sessions</dt>
                <dd className="font-semibold text-white">24</dd>
              </div>
              <div className="flex justify-between gap-4 py-3 last:pb-0">
                <dt className="text-slate-400">Volume lifted</dt>
                <dd className="font-semibold text-white">142,500 kg</dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card variant="glass" className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Notifications and privacy</h2>
                <p className="text-xs text-slate-400 mt-1">Control reminders, leaderboard visibility, and data preferences.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" leftIcon={<Shield className="w-4 h-4" />}>
              Manage settings
            </Button>
          </div>
        </Card>

        <Button
          variant="danger"
          size="lg"
          leftIcon={<LogOut className="w-5 h-5" />}
          onClick={logout}
          className="w-full sm:w-auto sm:self-end"
        >
          Sign out
        </Button>
      </PageContainer>
    </AppShell>
  );
};
