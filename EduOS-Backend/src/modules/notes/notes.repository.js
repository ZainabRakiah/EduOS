import BaseRepository from '../../shared/repositories/base.repository.js';
import prisma from '../../config/database.config.js';

class NotesRepository extends BaseRepository {
  constructor() {
    super('note', prisma);
    this.prisma = prisma;
  }

  async create(userId, data) {
    return this.prisma.note.create({
      data: { userId, ...data },
      include: { user: false },
    });
  }

  async findById(id, userId) {
    return this.prisma.note.findUnique({
      where: { id, userId },
    });
  }

  async findAll(userId, filters = {}, pagination = {}) {
    const { search, subject, tags, isPinned, isArchived } = filters;
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const where = { userId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subject !== undefined && subject !== null) {
      where.subject = subject;
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (isPinned !== undefined && isPinned !== null) {
      where.isPinned = isPinned;
    }

    if (isArchived !== undefined && isArchived !== null) {
      where.isArchived = isArchived;
    }

    const [data, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.note.count({ where }),
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
    return this.prisma.note.update({
      where: { id, userId },
      data,
    });
  }

  async delete(id, userId) {
    return this.prisma.note.delete({
      where: { id, userId },
    });
  }

  async count(userId, filters = {}) {
    const { search, subject, tags, isPinned, isArchived } = filters;

    const where = { userId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subject !== undefined && subject !== null) {
      where.subject = subject;
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (isPinned !== undefined && isPinned !== null) {
      where.isPinned = isPinned;
    }

    if (isArchived !== undefined && isArchived !== null) {
      where.isArchived = isArchived;
    }

    return this.prisma.note.count({ where });
  }

  async createSticky(userId, data) {
    return this.prisma.stickyNote.create({
      data: { userId, ...data },
    });
  }

  async findStickyAll(userId, filters = {}) {
    const { search } = filters;
    const where = { userId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.stickyNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findStickyById(id, userId) {
    return this.prisma.stickyNote.findUnique({
      where: { id, userId },
    });
  }

  async deleteSticky(id, userId) {
    return this.prisma.stickyNote.delete({
      where: { id, userId },
    });
  }
}

export default new NotesRepository();
