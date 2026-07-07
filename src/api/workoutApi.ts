import { httpClient } from './httpClient';

export const workoutApi = {
  getTodayWorkout: async () => httpClient.get('/workout/today'),
  startWorkout: async (data: any) => httpClient.post('/workout/start', data),
  logProgress: async (data: any) => httpClient.post('/workout/progress', data),
  completeWorkout: async (data: any) => httpClient.post('/workout/complete', data),
  getRecentActivity: async (limit: number) => httpClient.get(`/activity/recent?limit=${limit}`),
  getLatestPlan: async () => httpClient.get('/dashboard/latest-plan'),
  getHistory: async () => httpClient.get('/dashboard/history'),
  getPlans: async (params: any) => httpClient.get('/plans', { params }),
  completePlan: async (id: string, data: any) => httpClient.post(`/plans/${id}/complete`, data)
};
