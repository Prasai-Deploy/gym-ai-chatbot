import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

// ==========================================
// 1. Dashboard API Hook (Canonical Identity & Today Endpoint)
// ==========================================
export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const data: any = await httpClient.get('/identity/me');
      return data?.data || data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================
// 2. AI Coach API Hook
// ==========================================
export function useCoachData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['coach', 'history'],
    queryFn: async () => {
      const res: any = await httpClient.get('/ai/insights');
      return res?.insights || res?.data || [];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await httpClient.post('/ai/chat', { prompt: messageText });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'history'] });
    },
  });

  return { ...query, sendMessage: sendMessageMutation.mutateAsync, isSending: sendMessageMutation.isPending };
}

// ==========================================
// 3. Workout Engine API Hook (Canonical V2 Workouts Endpoint)
// ==========================================
export interface LogSetPayload {
  sessionId: string;
  exercise_id?: string;
  exerciseId?: string; // backwards compatibility alias
  weight_kg?: number;
  weightKg?: number; // backwards compatibility alias
  reps?: number;
  rpe?: number;
}

export function useWorkoutData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workout', 'today'],
    queryFn: async () => {
      const res: any = await httpClient.get('/workouts/today');
      return res?.data || res;
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: async (payload?: { planId?: string; title?: string }) => {
      const res: any = await httpClient.post('/workouts/sessions/start', payload || {});
      return res?.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', 'today'] });
    },
  });

  const logSetMutation = useMutation({
    mutationFn: async (setPayload: LogSetPayload) => {
      const rawExerciseId = setPayload.exercise_id || setPayload.exerciseId;
      const isUuid = rawExerciseId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawExerciseId.trim());
      const normalizedExerciseId = isUuid ? rawExerciseId.trim() : null;

      const backendPayload = {
        sessionId: setPayload.sessionId,
        exercise_id: normalizedExerciseId,
        weight_kg: setPayload.weight_kg ?? setPayload.weightKg ?? 0,
        reps: setPayload.reps ?? 0,
        rpe: setPayload.rpe,
      };
      const res: any = await httpClient.post('/workouts/sets', backendPayload);
      return res?.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', 'today'] });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes?: string }) => {
      const res: any = await httpClient.post(`/workouts/sessions/${sessionId}/complete`, { notes });
      return res?.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', 'today'] });
    },
  });

  return {
    ...query,
    activeSession: query.data?.activeSession ?? null,
    latestPlan: query.data?.latestPlan ?? null,
    startSession: startSessionMutation.mutateAsync,
    isStartingSession: startSessionMutation.isPending,
    logSet: logSetMutation.mutateAsync,
    isLoggingSet: logSetMutation.isPending,
    completeSession: completeSessionMutation.mutateAsync,
    isCompletingSession: completeSessionMutation.isPending,
  };
}

// ==========================================
// 4. Nutrition & Recovery API Hook (Canonical V2 Nutrition Endpoint)
// ==========================================
export function useNutritionData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['nutrition', 'daily'],
    queryFn: async () => {
      const res: any = await httpClient.get('/nutrition/daily');
      return res?.data || res;
    },
    retry: false,
  });

  const logWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      return await httpClient.post('/nutrition/water', { amount_ml: amountMl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily'] });
    },
  });

  return { ...query, logWater: logWaterMutation.mutateAsync, isLoggingWater: logWaterMutation.isPending };
}

// ==========================================
// 5. Progress Analytics API Hook (Canonical V2 Progress Endpoint)
// ==========================================
export function useProgressData() {
  return useQuery({
    queryKey: ['progress', 'statistics'],
    queryFn: async () => {
      const res: any = await httpClient.get('/progress/statistics');
      return res?.data || res;
    },
  });
}

// ==========================================
// 6. Owner SaaS Business OS API Hook
// ==========================================
export function useOwnerData() {
  return useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: async () => {
      const res: any = await httpClient.get('/analytics/executive');
      return res?.data || res;
    },
  });
}

// ==========================================
// 7. Trainer Workspace API Hook
// ==========================================
export function useTrainerData() {
  return useQuery({
    queryKey: ['trainer', 'workspace'],
    queryFn: async () => {
      const res: any = await httpClient.get('/analytics/trainers');
      return res?.data || res;
    },
  });
}

// ==========================================
// 8. Member Directory API Hook
// ==========================================
export function useMembersData(search?: string, filter?: string) {
  return useQuery({
    queryKey: ['members', search, filter],
    queryFn: async () => {
      const res: any = await httpClient.get('/analytics/members', { params: { search, filter } });
      return res?.data || res;
    },
  });
}

// ==========================================
// 9. Attendance & Access Control API Hook
// ==========================================
export function useAttendanceData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['attendance', 'live'],
    queryFn: async () => {
      const res: any = await httpClient.get('/analytics/attendance');
      return res?.data || res;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('attendance-turnstile-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['attendance', 'live'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// ==========================================
// 10. Membership & Billing API Hook
// ==========================================
export function useBillingData() {
  return useQuery({
    queryKey: ['billing', 'metrics'],
    queryFn: async () => {
      const res: any = await httpClient.get('/billing/subscriptions');
      return res?.data || res;
    },
  });
}

// ==========================================
// 11. Canonical Member Home Composite API Hook
// ==========================================
export function useMemberHomeData() {
  const userQuery = useDashboardData();
  const workoutQuery = useWorkoutData();
  const nutritionQuery = useNutritionData();
  const progressQuery = useProgressData();

  const isLoading = userQuery.isLoading;
  const isError = userQuery.isError || workoutQuery.isError || nutritionQuery.isError || progressQuery.isError;
  const error = userQuery.error || workoutQuery.error || nutritionQuery.error || progressQuery.error;

  const refetchAll = () => {
    userQuery.refetch();
    workoutQuery.refetch();
    nutritionQuery.refetch();
    progressQuery.refetch();
  };

  return {
    userData: userQuery.data,
    workoutData: workoutQuery.data,
    nutritionData: nutritionQuery.data,
    progressData: progressQuery.data,
    logWater: nutritionQuery.logWater,
    isLoggingWater: nutritionQuery.isLoggingWater,
    isLoading,
    isError,
    error,
    refetchAll,
  };
}
