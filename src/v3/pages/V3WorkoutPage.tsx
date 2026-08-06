import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from '../../design-system/shell/AppShell';
import { WorkoutLayout } from '../../design-system/workout/WorkoutLayout';
import { useWorkoutData } from '../../hooks/useStrivaApi';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

export const V3WorkoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: workoutData, isLoading } = useWorkoutData();
  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';

  return (
    <AppShell
      currentPath="/v3/workout"
      onNavigate={(path) => navigate(path)}
      onLogout={() => logout?.()}
      user={{
        name: userName,
        email: user?.email || 'athlete@striva.app',
        role: 'PRO Member',
      }}
    >
      {isLoading ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton height="140px" variant="card" />
          <LoadingSkeleton height="320px" variant="card" />
        </div>
      ) : (
        <WorkoutLayout
          routineTitle={workoutData?.workoutTitle || "Hypertrophy Chest & Triceps Blast"}
          category="Hypertrophy • Push Cycle"
          onFinishWorkoutComplete={() => navigate('/v3/dashboard')}
        />
      )}
    </AppShell>
  );
};
