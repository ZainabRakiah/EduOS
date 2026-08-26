import apiClient from './api.service.js';

const authService = {
  register: (payload) =>
    apiClient
      .post('/auth/register', {
        firstName: payload.firstName,
        lastName: payload.lastName,
        className: payload.className,
        email: payload.email,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
        terms: true,
        plan: payload.plan || 'FREE',
      })
      .then((r) => r.data),

  login: (payload) =>
    apiClient
      .post('/auth/login', {
        email: payload.email,
        password: payload.password,
        remember: payload.remember ?? true,
      })
      .then((r) => r.data),

  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  me: () => apiClient.get('/auth/me').then((r) => r.data),

  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
};

export default authService;
