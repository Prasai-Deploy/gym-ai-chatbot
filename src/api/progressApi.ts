import { httpClient } from './httpClient';

export const progressApi = {
  getChartData: async () => httpClient.get('/progress/chart-data'),
  getSummary: async () => httpClient.get('/progress/summary'),
  getDashboardProgress: async () => httpClient.get('/dashboard/progress'),
};
