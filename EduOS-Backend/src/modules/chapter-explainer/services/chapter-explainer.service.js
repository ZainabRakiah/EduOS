import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../../config/env.config.js';
import logger from '../../../services/logger.service.js';
import chapterExplainerRepository from '../repository/chapter-explainer.repository.js';
import BaseService from '../../../shared/services/base.service.js';
import prisma from '../../../config/database.config.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AWS S3 client if keys are present
let s3Client = null;
const isS3Configured = !!(
  config.aws.accessKeyId &&
  config.aws.secretAccessKey &&
  config.aws.region &&
  config.aws.s3Bucket
);

if (isS3Configured) {
  s3Client = new S3Client({
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
    region: config.aws.region,
  });
  logger.info('AWS S3 initialized for Chapter Explainer');
} else {
  logger.warn('AWS S3 credentials not fully configured. Falling back to local file storage.');
}

class ChapterExplainerService extends BaseService {
  constructor() {
    super(chapterExplainerRepository);
    this.repository = chapterExplainerRepository;
  }

  async createExplanation(userId, data, file) {
    const { title, class: className, subject, originalType, originalText } = data;
    let fileUrl = null;

    if (originalType === 'Text') {
      if (!originalText) {
        throw new BadRequestError('Chapter text is required for Text type.');
      }
    } else {
      if (!file) {
        throw new BadRequestError(`File is required for ${originalType} type.`);
      }

      // Perform file upload
      if (isS3Configured) {
        fileUrl = await this.uploadToS3(file);
      } else {
        fileUrl = await this.saveLocally(file);
      }
    }

    const resolvedClass = className?.trim() || 'General';
    const resolvedSubject = subject?.trim() || 'General';
    let resolvedTitle = title?.trim();
    if (!resolvedTitle) {
      if (file) {
        const baseName = file.originalname.split('.')[0];
        resolvedTitle = baseName.replace(/[-_]+/g, ' ').trim();
      } else if (originalText) {
        resolvedTitle = originalText.trim().substring(0, 30);
        if (originalText.trim().length > 30) {
          resolvedTitle += '...';
        }
      } else {
        resolvedTitle = 'Quick Explanation';
      }
    }

    const explanation = await this.repository.create(userId, {
      title: resolvedTitle,
      class: resolvedClass,
      subject: resolvedSubject,
      originalType,
      originalText: originalType === 'Text' ? originalText : null,
      originalFile: fileUrl,
      status: 'UPLOADED',
    });

    // Create a learning activity for the upload
    try {
      await prisma.learningActivity.create({
        data: {
          userId,
          type: 'UPLOAD',
          entityType: 'CHAPTER_EXPLANATION',
          entityId: explanation.id,
          title: `Uploaded chapter for explanation: ${explanation.title}`,
        },
      });
    } catch (err) {
      logger.error('Failed to log learning activity for explanation:', err);
    }

    return explanation;
  }

  async getExplanations(userId, pagination) {
    return this.repository.findAll(userId, pagination);
  }

  async getExplanationById(id, userId) {
    const explanation = await this.repository.findById(id, userId);
    if (!explanation) {
      throw new NotFoundError('Explanation not found.');
    }
    return explanation;
  }

  async uploadToS3(file) {
    const fileKey = `chapter-explainer/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    try {
      const command = new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);
      logger.info(`File uploaded successfully to S3: ${fileKey}`);
      return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${fileKey}`;
    } catch (error) {
      logger.error('S3 Upload Error, falling back to local storage:', error);
      return this.saveLocally(file);
    }
  }

  async saveLocally(file) {
    const uploadDir = path.join(__dirname, '../../../../public/uploads');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.promises.writeFile(filePath, file.buffer);
      logger.info(`File saved locally: ${filePath}`);
      return `/public/uploads/${fileName}`;
    } catch (error) {
      logger.error('Local File Save Error:', error);
      throw new Error('Failed to store uploaded file.');
    }
  }
}

export default new ChapterExplainerService();
