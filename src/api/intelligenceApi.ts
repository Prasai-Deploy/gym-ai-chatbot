import { httpClient } from './httpClient';

export const intelligenceApi = {
  getWaterToday: async () => httpClient.get('/water/today'),
  addWater: async (data: any) => httpClient.post('/water/add', data),
  setWaterGoal: async (data: any) => httpClient.post('/water/goal', data),
  deleteWater: async (id: string) => httpClient.delete(`/water/delete/${id}`),
};
