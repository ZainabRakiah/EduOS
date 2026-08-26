import api from './api.service.js';

export const getNotes = async (params = {}) => api.get('/notes', { params }).then((r) => r.data);

export const getNoteById = async (id) => api.get(`/notes/${id}`).then((r) => r.data);

export const createNote = async (data) => api.post('/notes', data).then((r) => r.data);

export const updateNote = async (id, data) => api.put(`/notes/${id}`, data).then((r) => r.data);

export const deleteNote = async (id) => api.delete(`/notes/${id}`).then((r) => r.data);

export default { getNotes, getNoteById, createNote, updateNote, deleteNote };
