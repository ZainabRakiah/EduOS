import BaseRepository from '../../shared/repositories/base.repository.js';
import prisma from '../../config/database.config.js';

class HistoryRepository extends BaseRepository {
  constructor() {
    super('learningActivity', prisma);
    this.prisma = prisma;
  }

  async getRecentActivities(userId, limit = 20) {
    return this.prisma.learningActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getViewed(userId, limit = 20) {
    return this.prisma.learningActivity.findMany({
      where: { userId, type: 'VIEW' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getEdited(userId, limit = 20) {
    return this.prisma.learningActivity.findMany({
      where: { userId, type: 'EDIT' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUploaded(userId, limit = 20) {
    return this.prisma.learningActivity.findMany({
      where: { userId, type: 'UPLOAD' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getStudyHistoryChart(userId, days = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        duration: true,
      },
    });

    const result = [];
    const dailyMap = new Map();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, 0);
    }

    for (const session of sessions) {
      const dateStr = new Date(session.createdAt).toISOString().split('T')[0];
      if (dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, dailyMap.get(dateStr) + (session.duration || 0));
      }
    }

    for (const [date, duration] of dailyMap.entries()) {
      result.push({
        date,
        hours: duration / 3600,
      });
    }

    return result;
  }
}

export default new HistoryRepository();
