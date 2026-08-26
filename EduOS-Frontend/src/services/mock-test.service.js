import api from './api.service.js';

export const getMockTests = async (params = {}) =>
  api.get('/mock-tests', { params }).then((r) => r.data);

export const getMockTestById = async (id) =>
  api.get(`/mock-tests/${id}`).then((r) => r.data);

export const deleteMockTest = async (id) =>
  api.delete(`/mock-tests/${id}`).then((r) => r.data);

export const submitAttempt = async (id, data) =>
  api.post(`/mock-tests/${id}/submit`, data).then((r) => r.data);

export const getAttemptDetails = async (attemptId) =>
  api.get(`/mock-tests/attempts/${attemptId}`).then((r) => r.data);

export const getUserAttempts = async () =>
  api.get('/mock-tests/attempts').then((r) => r.data);

export default {
  getMockTests,
  getMockTestById,
  deleteMockTest,
  submitAttempt,
  getAttemptDetails,
  getUserAttempts,
};
