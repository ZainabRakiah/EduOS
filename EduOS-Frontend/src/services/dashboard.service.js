import api from './api.service.js';

export const getDashboardData = async (days = 7) =>
  api.get(`/dashboard?days=${days}`).then((r) => r.data);

export default { getDashboardData };
