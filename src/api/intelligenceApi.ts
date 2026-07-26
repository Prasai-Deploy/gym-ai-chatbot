import { httpClient } from './httpClient';

export const intelligenceApi = {
  // -- v2 endpoints --
  getContext: async () => httpClient.get('/intelligence/context'),
  getRecommendations: async () => httpClient.get('/intelligence/recommendations'),
  logNutrition: async (data: any) => httpClient.post('/intelligence/nutrition/log', data),
  logRecovery: async (data: any) => httpClient.post('/intelligence/recovery/log', data),
  setMemory: async (data: any) => httpClient.post('/intelligence/memory', data),

  // -- Legacy water endpoints: map to logNutrition as closest v2 equivalent --
  // The v2 backend tracks water via nutrition logs, not a dedicated /water route.
  getWaterToday: async () => httpClient.get('/intelligence/context'),
  addWater: async (data: { amount: number; source?: string }) =>
    httpClient.post('/intelligence/nutrition/log', { water_ml: data.amount, source: data.source || 'manual' }),
  setWaterGoal: async (data: { goal: number }) =>
    httpClient.post('/intelligence/nutrition/log', { water_goal: data.goal }),
  deleteWater: async (_id: string) =>
    Promise.resolve({ success: false, message: 'Delete water not implemented in v2' }),
};
