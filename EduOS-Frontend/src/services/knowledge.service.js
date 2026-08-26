import api from './api.service.js';

export const getKnowledge = async (params = {}) =>
  api.get('/knowledge', { params }).then((r) => r.data);

export const getKnowledgeById = async (id) => api.get(`/knowledge/${id}`).then((r) => r.data);

export const createKnowledge = async (data) => api.post('/knowledge', data).then((r) => r.data);

export const updateKnowledge = async (id, data) =>
  api.put(`/knowledge/${id}`, data).then((r) => r.data);

export const deleteKnowledge = async (id) => api.delete(`/knowledge/${id}`).then((r) => r.data);

export default {
  getKnowledge,
  getKnowledgeById,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
};
