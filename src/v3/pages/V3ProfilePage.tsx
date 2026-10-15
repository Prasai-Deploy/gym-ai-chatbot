import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer } from '../../design-system/shell/PageContainer';
import { ProfileLayout } from '../../design-system/profile/ProfileLayout';
import { httpClient } from '../../api/httpClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, AlertCircle } from '../../design-system/icons';

export const V3ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load real authenticated profile identity
  const { data: identityData, isLoading } = useQuery({
    queryKey: ['identity', 'me'],
    queryFn: async () => {
      const res: any = await httpClient.get('/identity/me');
      return res?.data || res;
    },
  });

  const userName = user?.name || identityData?.profile?.full_name || user?.email?.split('@')[0] || 'Athlete';
  const email = user?.email || identityData?.profile?.email || 'athlete@striva.app';
  const role = user?.role || 'STRIVA Member';

  const fitness = identityData?.fitness;
  const preferences = identityData?.preferences;

  const primaryGoal = fitness?.primary_goal || 'Build Strength & Hypertrophy';
  const initialHeightCm = fitness?.height_cm || 178;
  const initialWeightKg = fitness?.target_weight_kg || 78;
  const initialExperience = fitness?.level
    ? fitness.level.charAt(0).toUpperCase() + fitness.level.slice(1)
    : 'Intermediate';

  const initialUnitSystem = preferences?.unit_system || 'metric';
  const initialNotifications = preferences?.push_notifications_enabled ?? true;

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleSaveGoals = async (primary: string) => {
    try {
      await httpClient.patch('/identity/profile/fitness', { primary_goal: primary });
      await queryClient.invalidateQueries({ queryKey: ['identity', 'me'] });
      showToast('success', 'Athlete goals updated successfully.');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to update athlete goals.');
    }
  };

  const handleSaveFitnessProfile = async (data: { height: number; weight: number; experience: string }) => {
    if (data.height < 50 || data.height > 260) {
      showToast('error', 'Please enter a valid height between 50 and 260 cm.');
      return;
    }
    if (data.weight < 20 || data.weight > 350) {
      showToast('error', 'Please enter a valid weight between 20 and 350 kg.');
      return;
    }

    try {
      await httpClient.patch('/identity/profile/fitness', {
        height_cm: data.height,
        target_weight_kg: data.weight,
        level: data.experience.toLowerCase(),
      });
      await queryClient.invalidateQueries({ queryKey: ['identity', 'me'] });
      showToast('success', 'Fitness profile and biometrics saved.');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to update fitness profile.');
    }
  };

  const handleSavePreferences = async (unitSystem: 'metric' | 'imperial', notifs: boolean) => {
    try {
      await httpClient.patch('/identity/profile/preferences', {
        unit_system: unitSystem,
        push_notifications_enabled: notifs,
      });
      await queryClient.invalidateQueries({ queryKey: ['identity', 'me'] });
      showToast('success', 'Preferences updated.');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to update preferences.');
    }
  };

  return (
    <PageContainer
      title="Profile"
      subtitle="Your personal athlete profile and preferences."
    >
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 p-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold select-none animate-slide-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/90 border border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <ProfileLayout
        userName={userName}
        email={email}
        role={role}
        primaryGoal={primaryGoal}
        initialHeightCm={initialHeightCm}
        initialWeightKg={initialWeightKg}
        initialExperience={initialExperience}
        initialUnitSystem={initialUnitSystem}
        initialNotifications={initialNotifications}
        onSaveGoals={handleSaveGoals}
        onSaveFitnessProfile={handleSaveFitnessProfile}
        onSavePreferences={handleSavePreferences}
        onNavigateBilling={() => navigate('/v3/billing')}
        onLogout={() => logout?.()}
      />
    </PageContainer>
  );
};
