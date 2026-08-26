import BaseService from '../../shared/services/base.service.js';
import prisma from '../../config/database.config.js';
import knowledgeRepository from './knowledge.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

class KnowledgeService extends BaseService {
  constructor(repository) {
    super(repository);
    this.repository = repository;
    this.prisma = prisma;
  }

  async createActivity(userId, type, entityType, entityId, title, metadata = null) {
    const activityData = {
      userId,
      type,
      entityType,
      entityId,
      title,
      metadata,
    };

    if (entityType === 'KNOWLEDGE') {
      activityData.knowledgeTopicId = entityId;
    }

    return this.prisma.learningActivity.create({
      data: activityData,
    });
  }

  async createKnowledge(userId, data) {
    const knowledge = await this.repository.create(userId, data);

    await this.createActivity(
      userId,
      'CREATE',
      'KNOWLEDGE',
      knowledge.id,
      `Created knowledge topic: ${knowledge.name}`,
      {
        type: knowledge.type,
        subject: knowledge.subject,
      },
    );

    return knowledge;
  }

  async getById(id, userId) {
    const knowledge = await this.repository.findById(id, userId);
    if (!knowledge) {
      throw new NotFoundError('Knowledge topic not found.');
    }
    return knowledge;
  }

  async getAll(userId, filters = {}, pagination = {}) {
    return this.repository.findAll(userId, filters, pagination);
  }

  async update(id, userId, data) {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Knowledge topic not found.');
    }

    const knowledge = await this.repository.update(id, userId, data);

    await this.createActivity(
      userId,
      'EDIT',
      'KNOWLEDGE',
      knowledge.id,
      `Updated knowledge topic: ${knowledge.name}`,
      {
        changedFields: Object.keys(data),
        type: knowledge.type,
        subject: knowledge.subject,
      },
    );

    return knowledge;
  }

  async delete(id, userId) {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Knowledge topic not found.');
    }

    const knowledge = await this.repository.delete(id, userId);

    await this.createActivity(
      userId,
      'DELETE',
      'KNOWLEDGE',
      id,
      `Deleted knowledge topic: ${existing.name}`,
      {
        type: existing.type,
        subject: existing.subject,
      },
    );

    return knowledge;
  }

  async count(userId, filters = {}) {
    return this.repository.count(userId, filters);
  }
}

export default new KnowledgeService(knowledgeRepository);
