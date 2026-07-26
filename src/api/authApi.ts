import { httpClient } from './httpClient';

export const authApi = {
  getMe: async () => httpClient.get('/identity/me'), // Use identity instead of auth to hit correct module
  resetDemoUser: async () => httpClient.post('/identity/demo/reset')
};
