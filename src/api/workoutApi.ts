import { httpClient } from './httpClient';

export const workoutApi = {
  // -- Session execution (v2 endpoints) --
  getSession: async (sessionId: string) => httpClient.get(`/workouts/sessions/${sessionId}`),
  transitionState: async (sessionId: string, data: { state: string; notes?: string }) =>
    httpClient.post(`/workouts/sessions/${sessionId}/transition`, data),
  completeSet: async (setId: string, data: any) => httpClient.patch(`/workouts/sets/${setId}`, data),

  // -- Workout Programs (v2) --
  getPrograms: async (params?: any) => httpClient.get('/workouts/programs', { params }),

  // -- Legacy-compatible aliases used by dashboard hooks --
  // These are no longer backed by a v2 endpoint. The dashboard hooks will be
  // migrated to use getSession/transitionState instead.
  // Kept here to prevent 'not a function' crashes while migration is in progress.
  getTodayWorkout: async () => httpClient.get('/workouts/programs'),
  startWorkout: async (data: any) => httpClient.post('/workouts/sessions/start', data),
  logProgress: async (data: any) => httpClient.post('/workouts/sessions/log', data),
  completeWorkout: async (data: any) => httpClient.post('/workouts/sessions/complete', data),
  getRecentActivity: async (limit: number) => httpClient.get(`/workouts/programs?limit=${limit}`),
  getLatestPlan: async () => httpClient.get('/workouts/programs?latest=true'),
  getHistory: async () => httpClient.get('/workouts/programs'),
  getPlans: async (params: any) => httpClient.get('/workouts/programs', { params }),
  completePlan: async (id: string, data: any) => httpClient.post(`/workouts/programs/${id}/complete`, data),
};
