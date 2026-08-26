import api from './api.service.js';

export const getResources = async (params = {}) =>
  api.get('/resources', { params }).then((r) => r.data);

export const getResourceById = async (id) => api.get(`/resources/${id}`).then((r) => r.data);

export const uploadResource = async (formData, onProgress) => {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  if (typeof onProgress === 'function') {
    config.onUploadProgress = (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    };
  } else if (typeof onProgress === 'object' && onProgress !== null) {
    if (typeof onProgress.onProgress === 'function') {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress.onProgress(percent);
        }
      };
    } else if (typeof onProgress.onUploadProgress === 'function') {
      config.onUploadProgress = onProgress.onUploadProgress;
    }
  }
  return api.post('/resources/upload', formData, config).then((r) => r.data);
};

export const deleteResource = async (id) => api.delete(`/resources/${id}`).then((r) => r.data);

export const getDocumentProcessingStatus = async (resourceId) =>
  api.get(`/document-processing/${resourceId}`).then((r) => r.data);

export const triggerDocumentProcessing = async (resourceId) =>
  api.post(`/document-processing/process/${resourceId}`).then((r) => r.data);

export default {
  getResources,
  getResourceById,
  uploadResource,
  deleteResource,
  getDocumentProcessingStatus,
  triggerDocumentProcessing,
};
