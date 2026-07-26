import { httpClient } from './httpClient';

export const progressApi = {
  // -- v2 endpoints --
  getStatistics: async () => httpClient.get('/progress/statistics'),
  getAchievements: async () => httpClient.get('/progress/achievements'),

  // -- Legacy aliases kept to prevent crashes during migration --
  // These map to the closest v2 equivalent. The chart data shape will differ
  // from the legacy format — components will need to be updated as well.
  getChartData: async () => httpClient.get('/progress/statistics'),
  getSummary: async () => httpClient.get('/progress/statistics'),
  getDashboardProgress: async () => httpClient.get('/progress/statistics'),
};
