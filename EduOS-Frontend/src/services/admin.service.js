import apiClient from './api.service.js';

class AdminService {
  async getDashboardStats() {
    return apiClient.get('/admin/dashboard');
  }

  async getUsers(params = {}) {
    return apiClient.get('/admin/users', { params });
  }

  async getUserById(id) {
    return apiClient.get(`/admin/users/${id}`);
  }

  async toggleUserStatus(id, status) {
    return apiClient.patch(`/admin/users/${id}/status`, { status });
  }

  async getSubscriptions(params = {}) {
    return apiClient.get('/admin/subscriptions', { params });
  }

  async updateSubscription(userId, data) {
    return apiClient.patch(`/admin/subscriptions/${userId}`, data);
  }

  async getAnalytics(params = {}) {
    return apiClient.get('/admin/analytics', { params });
  }

  async getAuditLogs(params = {}) {
    return apiClient.get('/admin/audit-logs', { params });
  }
}

export default new AdminService();
