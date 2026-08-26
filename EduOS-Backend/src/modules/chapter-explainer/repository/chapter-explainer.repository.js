import BaseRepository from '../../../shared/repositories/base.repository.js';
import prisma from '../../../config/database.config.js';

class ChapterExplainerRepository extends BaseRepository {
  constructor() {
    super('chapterExplanation', prisma);
    this.prisma = prisma;
  }

  async create(userId, data) {
    return this.prisma.chapterExplanation.create({
      data: { userId, ...data },
    });
  }

  async findById(id, userId) {
    return this.prisma.chapterExplanation.findUnique({
      where: { id, userId },
    });
  }

  async findAll(userId, pagination = {}) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.chapterExplanation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.chapterExplanation.count({ where }),
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
    return this.prisma.chapterExplanation.update({
      where: { id, userId },
      data,
    });
  }

  async delete(id, userId) {
    return this.prisma.chapterExplanation.delete({
      where: { id, userId },
    });
  }
}

export default new ChapterExplainerRepository();
