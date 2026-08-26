import BaseRepository from '../../shared/repositories/base.repository.js';
import prisma from '../../config/database.config.js';

class ResourceRepository extends BaseRepository {
  constructor() {
    super('resource', prisma);
    this.prisma = prisma;
  }

  async createResource(userId, data) {
    return this.prisma.resource.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async findResourceById(id, userId) {
    return this.prisma.resource.findUnique({
      where: {
        id,
        userId,
      },
    });
  }

  async findAllResources(userId) {
    return this.prisma.resource.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteResource(id, userId) {
    return this.prisma.resource.delete({
      where: {
        id,
        userId,
      },
    });
  }
}

export default new ResourceRepository();
