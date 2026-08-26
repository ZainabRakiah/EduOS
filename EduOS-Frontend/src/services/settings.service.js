import apiClient from './api.service.js';

const settingsService = {
  getProfile: () => apiClient.get('/settings/me').then((r) => r.data),

  updateProfile: (data) => apiClient.put('/settings/profile', data).then((r) => r.data),

  changePassword: (data) => apiClient.post('/settings/password', data).then((r) => r.data),
};

export default settingsService;
