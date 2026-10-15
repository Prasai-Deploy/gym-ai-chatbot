import { httpClient } from './httpClient';

export const workoutApi = {
  // -- Session execution (v2 endpoints) --
  getSession: async (sessionId: string) => httpClient.get(`/workouts/sessions/${sessionId}`),
  transitionState: async (sessionId: string, data: { state: string; notes?: string }) =>
    httpClient.post(`/workouts/sessions/${sessionId}/transition`, data),
  completeSet: async (setId: string, data: any) => httpClient.patch(`/workouts/sets/${setId}`, data),

  // -- Workout Programs (v2) --
  getPrograms: async (params?: any) => httpClient.get('/workouts/programs', { params }),

  // -- Canonical V2 Workout Endpoints --
  getTodayWorkout: async () => httpClient.get('/workouts/today'),
  getHistory: async () => httpClient.get('/workouts/history'),
  getPlans: async (params?: any) => httpClient.get('/workouts/plans', { params }),
  startWorkout: async (data?: any) => httpClient.post('/workouts/sessions/start', data || {}),
  completeWorkout: async (sessionIdOrData: any, data?: any) => {
    const sessionId = typeof sessionIdOrData === 'string' ? sessionIdOrData : sessionIdOrData?.sessionId;
    if (sessionId) {
      return httpClient.post(`/workouts/sessions/${sessionId}/complete`, typeof sessionIdOrData === 'object' ? sessionIdOrData : data);
    }
    return httpClient.post('/workouts/sessions/complete', sessionIdOrData);
  },
  logSet: async (data: any) => httpClient.post('/workouts/sets', data),
  logProgress: async (data: any) => httpClient.post('/workouts/sets', data),
  getRecentActivity: async (limit: number = 20) => httpClient.get(`/workouts/history?limit=${limit}`),
  getLatestPlan: async () => httpClient.get('/workouts/plans'),
  completePlan: async (id: string, data?: any) => httpClient.patch(`/workouts/plans/${id}`, data),
};
