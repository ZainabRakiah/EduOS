import api from './api.service.js';

export const uploadExplanation = async (formData) =>
  api
    .post('/chapter-explainer/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((r) => r.data);

export const getExplanations = async (params = {}) =>
  api.get('/chapter-explainer', { params }).then((r) => r.data);

export const getExplanationById = async (id) =>
  api.get(`/chapter-explainer/${id}`).then((r) => r.data);

export const chatWithAi = async (prompt) => api.post('/ai/chat', { prompt }).then((r) => r);

export default { uploadExplanation, getExplanations, getExplanationById, chatWithAi };
