import BaseService from '../../shared/services/base.service.js';
import resourceRepository from './resource.repository.js';
import s3Service from '../../services/storage/s3.service.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';
import prisma from '../../config/database.config.js';
import documentProcessingService from '../document-processing/document-processing.service.js';
import logger from '../../services/logger.service.js';

class ResourceService extends BaseService {
  constructor(repository) {
    super(repository);
    this.repository = repository;
  }

  async uploadResource(userId, file) {
    let fileType;
    if (file.mimetype === 'application/pdf') {
      fileType = 'PDF';
    } else if (file.mimetype.startsWith('image/')) {
      fileType = 'IMAGE';
    } else {
      throw new BadRequestError('Unsupported file type. Only PDF and images are allowed.');
    }

    const uploadResult = await s3Service.uploadFile(file);

    const data = {
      title: file.originalname,
      originalFileName: file.originalname,
      fileType,
      fileUrl: uploadResult.url,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'PROCESSING',
    };

    const resource = await this.repository.createResource(userId, data);

    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'UPLOAD',
        entityType: 'RESOURCE',
        entityId: resource.id,
        title: resource.title,
        resourceId: resource.id,
      },
    });

    // Trigger background document processing (non-blocking)
    documentProcessingService.processDocument(resource.id).catch((err) => {
      logger.error(`Background document processing failed for Resource ${resource.id}:`, err);
    });

    return resource;
  }

  async getResourceById(userId, id) {
    const resource = await this.repository.findResourceById(id, userId);
    if (!resource) {
      throw new NotFoundError('Resource not found.');
    }
    return resource;
  }

  async getResources(userId) {
    return this.repository.findAllResources(userId);
  }

  async deleteResource(userId, id) {
    const resource = await this.repository.findResourceById(id, userId);
    if (!resource) {
      throw new NotFoundError('Resource not found.');
    }

    await s3Service.deleteFile(resource.fileUrl);

    await this.repository.deleteResource(id, userId);

    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'DELETE',
        entityType: 'RESOURCE',
        entityId: id,
        title: resource.title,
        resourceId: id,
      },
    });

    return true;
  }
}

export default new ResourceService(resourceRepository);
