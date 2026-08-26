import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import config from '../../config/env.config.js';
import logger from '../logger.service.js';

class S3Service {
  constructor() {
    const { accessKeyId, secretAccessKey, region, s3Bucket } = config.aws;
    this.bucketName = s3Bucket;
    this.region = region || 'us-east-1';

    const clientConfig = {
      region: this.region,
    };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  generateUniqueFileName(originalName) {
    const ext = path.extname(originalName);
    const baseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    return `${Date.now()}-${baseName}-${uuidv4()}${ext}`;
  }

  async uploadFile(file) {
    try {
      const fileName = this.generateUniqueFileName(file.originalname);

      // Graceful fallback for local development if S3 credentials/bucket are not set
      if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !this.bucketName) {
        logger.warn(
          'AWS S3 credentials or bucket not configured. Saving file to local storage for parsing.',
        );
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await fs.promises.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(filePath, file.buffer);

        const localUrl = `http://localhost:${config.port}/public/uploads/${fileName}`;
        return {
          url: localUrl,
          key: fileName,
        };
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
      return {
        url,
        key: fileName,
      };
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  async deleteFile(fileUrlOrKey) {
    try {
      if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !this.bucketName) {
        logger.warn(
          'AWS S3 credentials or bucket not configured. Simulating delete in development.',
        );
        if (fileUrlOrKey && fileUrlOrKey.includes('/public/uploads/')) {
          const fileName = path.basename(fileUrlOrKey);
          const filePath = path.join(process.cwd(), 'public/uploads', fileName);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            logger.info(`Deleted local file: ${filePath}`);
          }
        }
        return true;
      }

      let key = fileUrlOrKey;
      if (fileUrlOrKey.startsWith('http')) {
        const parts = fileUrlOrKey.split('/');
        key = parts[parts.length - 1];
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw error;
    }
  }
}

export default new S3Service();
