import prisma from '../../config/database.config.js';

class AdminRepository {
  async getDashboardStats() {
    const now = new Date();
    const totalUsers = await prisma.user.count();

    const premiumCount = await prisma.user.count({
      where: {
        subscription: {
          plan: 'PREMIUM',
          status: 'ACTIVE',
          OR: [
            { endDate: null },
            { endDate: { gt: now } },
          ],
        },
      },
    });

    const freeCount = totalUsers - premiumCount;

    // New users today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newToday = await prisma.user.count({
      where: { createdAt: { gte: startOfToday } },
    });

    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newThisMonth = await prisma.user.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // Active, expired, cancelled subs
    const activeSubs = await prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gt: now } },
        ],
      },
    });

    const expiredSubs = await prisma.subscription.count({
      where: {
        OR: [
          { status: 'EXPIRED' },
          { endDate: { lte: now } },
        ],
      },
    });

    const cancelledSubs = await prisma.subscription.count({
      where: { status: 'CANCELLED' },
    });

    // Usage aggregates
    const aiRequests = await prisma.aiUsage.count();
    const mockTests = await prisma.mockTest.count();
    const notesCount = await prisma.note.count();
    const resourcesCount = await prisma.resource.count();

    // User growth aggregation (6 months history)
    const growth = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();

      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const count = await prisma.user.count({
        where: { createdAt: { gte: start, lte: end } },
      });

      growth.push({
        month: monthNames[month],
        count,
      });
    }

    return {
      users: {
        total: totalUsers,
        free: freeCount,
        premium: premiumCount,
        newToday,
        newThisMonth,
      },
      subscriptions: {
        active: activeSubs,
        expired: expiredSubs,
        cancelled: cancelledSubs,
      },
      usage: {
        aiRequests,
        mockTests,
        notes: notesCount,
        resources: resourcesCount,
      },
      growth,
    };
  }

  async getUsers({ page = 1, limit = 10, search = '', role, plan, status, subscriptionStatus, classFilter }) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (classFilter) {
      where.className = classFilter;
    }

    if (plan || subscriptionStatus) {
      where.subscription = {};

      if (plan) {
        where.subscription.plan = plan;
      }

      if (subscriptionStatus) {
        if (subscriptionStatus === 'ACTIVE') {
          where.subscription.status = 'ACTIVE';
          where.subscription.OR = [
            { endDate: null },
            { endDate: { gt: now } },
          ];
        } else if (subscriptionStatus === 'EXPIRED') {
          where.subscription.OR = [
            { status: 'EXPIRED' },
            { endDate: { lte: now } },
          ];
        } else {
          where.subscription.status = subscriptionStatus;
        }
      }
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users,
    };
  }

  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        subscriptionHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) return null;

    // Aggregate statistics
    const notesCount = await prisma.note.count({ where: { userId: id } });
    const resourcesCount = await prisma.resource.count({ where: { userId: id } });
    const studySessionsCount = await prisma.studySession.count({ where: { userId: id } });
    const mockAttemptCount = await prisma.mockAttempt.count({ where: { userId: id } });
    const aiExplainsCount = await prisma.aiUsage.count({ where: { userId: id, feature: 'EXPLAIN' } });
    const aiUsageTotal = await prisma.aiUsage.count({ where: { userId: id } });

    // Recent activity
    const recentActivities = await prisma.learningActivity.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const { passwordHash, refreshToken, ...profile } = user;

    return {
      profile: {
        ...profile,
        lastLoginAt: user.lastLoginAt,
      },
      stats: {
        notesCount,
        resourcesCount,
        studySessionsCount,
        mockAttemptCount,
        aiExplainsCount,
        aiUsageTotal,
      },
      recentActivities,
    };
  }

  async updateUserStatus(id, status) {
    return prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });
  }

  async getSubscriptions({ page = 1, limit = 10, plan, status }) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const where = {};

    if (plan) {
      where.plan = plan;
    }

    if (status) {
      if (status === 'ACTIVE') {
        where.status = 'ACTIVE';
        where.OR = [
          { endDate: null },
          { endDate: { gt: now } },
        ];
      } else if (status === 'EXPIRED') {
        where.OR = [
          { status: 'EXPIRED' },
          { endDate: { lte: now } },
        ];
      } else {
        where.status = status;
      }
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      subscriptions,
    };
  }

  async updateSubscription(userId, { plan, status, endDate, adminId }) {
    return prisma.$transaction(async (tx) => {
      const oldSub = await tx.subscription.findUnique({
        where: { userId },
      });

      const updatedSub = await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          status,
          startDate: new Date(),
          endDate,
        },
        update: {
          plan,
          status,
          endDate,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          userId,
          action: oldSub ? (plan === 'PREMIUM' && oldSub.plan === 'FREE' ? 'UPGRADED' : 'EXTENDED') : 'CREATED',
          oldPlan: oldSub?.plan || null,
          newPlan: plan,
          oldStatus: oldSub?.status || null,
          newStatus: status,
          startDate: updatedSub.startDate,
          endDate: updatedSub.endDate,
          performedBy: adminId || 'SYSTEM',
        },
      });

      return updatedSub;
    });
  }

  async getAnalytics({ from, to }) {
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const filter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const userCount = await prisma.user.count({ where: filter });
    const subCount = await prisma.subscription.count({
      where: {
        plan: 'PREMIUM',
        status: 'ACTIVE',
        ...(Object.keys(dateFilter).length > 0 ? { updatedAt: dateFilter } : {}),
      },
    });

    const aiRequests = await prisma.aiUsage.count({ where: filter });
    const mockTests = await prisma.mockTest.count({ where: filter });
    const notesCreated = await prisma.note.count({ where: filter });
    const resourcesUploaded = await prisma.resource.count({ where: filter });

    // Feature Usage Breakdown
    const aiExplainerCount = await prisma.aiUsage.count({
      where: {
        feature: 'EXPLAIN',
        ...filter,
      },
    });
    
    const aiChatCount = await prisma.aiUsage.count({
      where: {
        feature: 'CHAT',
        ...filter,
      },
    });

    const aiImageCount = await prisma.aiUsage.count({
      where: {
        feature: 'IMAGE_GENERATE',
        ...filter,
      },
    });

    return {
      usersRegistered: userCount,
      premiumSubscriptions: subCount,
      aiRequests,
      mockTestsCreated: mockTests,
      notesCreated,
      resourcesUploaded,
      featureUsage: {
        aiExplainer: aiExplainerCount,
        aiChat: aiChatCount,
        aiImages: aiImageCount,
        notes: notesCreated,
        resources: resourcesUploaded,
      },
    };
  }

  async getAuditLogs({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }

  async createAuditLog({ adminId, action, targetUserId, description, metadata }) {
    return prisma.auditLog.create({
      data: {
        adminId,
        action,
        targetUserId,
        description,
        metadata: metadata || null,
      },
    });
  }
}

export default new AdminRepository();
