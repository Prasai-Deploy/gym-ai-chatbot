import { httpClient } from './httpClient';

export const nutritionApi = {
  getDailySummary: async (date?: string) => httpClient.get('/nutrition/daily', { params: { date } }),
  createMeal: async (data: { food_name: string; calories: number; meal_type?: string; protein_g?: number; carbs_g?: number; fats_g?: number; date?: string }) =>
    httpClient.post('/nutrition/meals', data),
  updateMeal: async (id: string, data: any) => httpClient.patch(`/nutrition/meals/${id}`, data),
  deleteMeal: async (id: string) => httpClient.delete(`/nutrition/meals/${id}`),

  getWaterLogs: async (date?: string) => httpClient.get('/nutrition/water', { params: { date } }),
  addWaterLog: async (data: { amount_ml: number; date?: string }) => httpClient.post('/nutrition/water', data),
  deleteWaterLog: async (id: string) => httpClient.delete(`/nutrition/water/${id}`),
};
