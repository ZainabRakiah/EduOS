import BaseRepository from '../../shared/repositories/base.repository.js';
import prisma from '../../config/database.config.js';

class KnowledgeRepository extends BaseRepository {
  constructor() {
    super('knowledgeTopic', prisma);
    this.prisma = prisma;
  }

  async create(userId, data) {
    return this.prisma.knowledgeTopic.create({
      data: {
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
        type: data.type || 'CONCEPT',
        status: data.status || 'DRAFT',
        content: data.content || '',
        subject: data.subject || null,
        tags: data.tags || [],
        mastery: data.mastery || 0,
        userId,
      },
    });
  }

  async findById(id, userId) {
    return this.prisma.knowledgeTopic.findUnique({
      where: { id, userId },
    });
  }

  async findAll(userId, filters = {}, pagination = {}) {
    const where = { userId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.subject) {
      where.subject = filters.subject;
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.knowledgeTopic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.knowledgeTopic.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async update(id, userId, data) {
    const updateData = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.subject !== undefined) {
      updateData.subject = data.subject || null;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }
    if (data.mastery !== undefined) {
      updateData.mastery = data.mastery;
    }

    return this.prisma.knowledgeTopic.update({
      where: { id, userId },
      data: updateData,
    });
  }

  async delete(id, userId) {
    return this.prisma.knowledgeTopic.delete({
      where: { id, userId },
    });
  }

  async count(userId, filters = {}) {
    const where = { userId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.subject) {
      where.subject = filters.subject;
    }

    return this.prisma.knowledgeTopic.count({ where });
  }
}

export default new KnowledgeRepository();
