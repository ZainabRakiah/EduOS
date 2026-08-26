import prisma from '../../config/database.config.js';

class DashboardService {
  async getStats(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [notesCount, resourcesCount, knowledgeCount, sessions] = await Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.resource.count({ where: { userId } }),
      prisma.knowledgeTopic.count({ where: { userId } }),
      prisma.studySession.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { duration: true },
      }),
    ]);

    const totalStudySeconds = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    return {
      totalNotes: notesCount,
      totalResources: resourcesCount,
      totalKnowledgeTopics: knowledgeCount,
      totalStudyHours: totalStudySeconds / 3600,
    };
  }

  async getLearningChart(userId, days = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
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

  async getRecentActivity(userId, limit = 10) {
    return prisma.learningActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export default new DashboardService();
