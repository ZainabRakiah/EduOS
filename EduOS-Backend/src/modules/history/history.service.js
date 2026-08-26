import BaseService from '../../shared/services/base.service.js';
import historyRepository from './history.repository.js';

class HistoryService extends BaseService {
  constructor(repository) {
    super(repository);
    this.repository = repository;
  }

  async getRecentActivities(userId, limit = 20) {
    return this.repository.getRecentActivities(userId, limit);
  }

  async getViewed(userId, limit = 20) {
    return this.repository.getViewed(userId, limit);
  }

  async getEdited(userId, limit = 20) {
    return this.repository.getEdited(userId, limit);
  }

  async getUploaded(userId, limit = 20) {
    return this.repository.getUploaded(userId, limit);
  }

  async getStudyHistoryChart(userId, days = 7) {
    return this.repository.getStudyHistoryChart(userId, days);
  }
}

export default new HistoryService(historyRepository);
