import React from 'react';
import { MinimalProfileHero } from './MinimalProfileHero';
import { ProfileGoals } from './ProfileGoals';
import { FitnessProfileSection } from './FitnessProfileSection';
import { ProfilePreferences } from './ProfilePreferences';
import { ConnectedDevicesSection } from './ConnectedDevicesSection';
import { AccountSettingsSection } from './AccountSettingsSection';
import { cn } from '../tokens';

export interface ProfileLayoutProps {
  userName?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  onNavigateBilling?: () => void;
  onLogout?: () => void;
  className?: string;
}

export const ProfileLayout: React.FC<ProfileLayoutProps> = React.memo(({
  userName = 'Athlete',
  email = 'athlete@striva.app',
  role = 'PRO Member',
  avatarUrl,
  onNavigateBilling = () => console.log('Navigate billing'),
  onLogout = () => console.log('Logout'),
  className,
}) => {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8', className)}>
      {/* 1. Header Identity */}
      <div className="flex flex-col gap-0.5 select-none">
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          {formattedDate}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          Athlete Profile & System Setup
        </h1>
      </div>

      {/* 2. Minimal Profile Hero */}
      <MinimalProfileHero
        userName={userName}
        email={email}
        role={role}
        memberSinceYear={2026}
        avatarUrl={avatarUrl}
      />

      {/* 3. Goals Section */}
      <ProfileGoals />

      {/* 4. Fitness Profile Information */}
      <FitnessProfileSection />

      {/* 5. Preferences & Settings */}
      <ProfilePreferences />

      {/* 6. Connected Wearables & Integrations */}
      <ConnectedDevicesSection />

      {/* 7. Account, Plan & Security */}
      <AccountSettingsSection
        onNavigateBilling={onNavigateBilling}
        onLogout={onLogout}
      />
    </div>
  );
});

ProfileLayout.displayName = 'ProfileLayout';
