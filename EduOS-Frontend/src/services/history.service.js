import apiClient from './api.service.js';

const historyService = {
  getRecent: () => apiClient.get('/history/recent').then((r) => r.data),

  getViewed: () => apiClient.get('/history/viewed').then((r) => r.data),

  getEdited: () => apiClient.get('/history/edited').then((r) => r.data),

  getUploaded: () => apiClient.get('/history/uploaded').then((r) => r.data),

  getStudyChart: (days = 7) =>
    apiClient.get('/history/study-chart', { params: { days } }).then((r) => r.data),
};

export default historyService;
