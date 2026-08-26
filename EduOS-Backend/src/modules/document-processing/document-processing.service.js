import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import BaseService from '../../shared/services/base.service.js';
import documentProcessingRepository from './document-processing.repository.js';
import prisma from '../../config/database.config.js';
import logger from '../../services/logger.service.js';

// Helper function for semantic chunking
function chunkPageText(pageNumber, text, maxSize = 1000) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let currentChunkText = '';
  let chunkIndex = 0;

  for (let para of paragraphs) {
    para = para.trim();
    if (!para) continue;

    // If paragraph is huge (greater than maxSize), we split it by sentences
    if (para.length > maxSize) {
      if (currentChunkText.trim().length > 0) {
        chunks.push({
          pageNumber,
          chunkIndex: chunkIndex++,
          chunkText: currentChunkText.trim(),
        });
        currentChunkText = '';
      }

      const sentences = para.split(/(?<=[.?!])\s+/);
      for (let sentence of sentences) {
        sentence = sentence.trim();
        if (!sentence) continue;

        if (currentChunkText.length + sentence.length + 1 > maxSize) {
          if (currentChunkText.trim().length > 0) {
            chunks.push({
              pageNumber,
              chunkIndex: chunkIndex++,
              chunkText: currentChunkText.trim(),
            });
          }
          currentChunkText = sentence;
        } else {
          currentChunkText = currentChunkText ? `${currentChunkText} ${sentence}` : sentence;
        }
      }
    } else {
      if (currentChunkText.length + para.length + 2 > maxSize) {
        if (currentChunkText.trim().length > 0) {
          chunks.push({
            pageNumber,
            chunkIndex: chunkIndex++,
            chunkText: currentChunkText.trim(),
          });
        }
        currentChunkText = para;
      } else {
        currentChunkText = currentChunkText ? `${currentChunkText}\n\n${para}` : para;
      }
    }
  }

  if (currentChunkText.trim().length > 0) {
    chunks.push({
      pageNumber,
      chunkIndex: chunkIndex++,
      chunkText: currentChunkText.trim(),
    });
  }

  return chunks;
}

class DocumentProcessingService extends BaseService {
  constructor(repository) {
    super(repository);
    this.repository = repository;
  }

  async processDocument(resourceId) {
    try {
      logger.info(`Starting background document processing for Resource: ${resourceId}`);

      await this.repository.updateResourceStatus(resourceId, 'PROCESSING');

      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        logger.error(`Resource ${resourceId} not found in database.`);
        return;
      }

      if (resource.fileType === 'IMAGE') {
        logger.info(
          `Resource ${resourceId} is an image. Skipping text extraction, updating status to READY.`,
        );
        await this.repository.updateResourceStatus(resourceId, 'READY');
        return;
      }

      let pages = [];
      const chunks = [];

      try {
        if (resource.fileUrl.includes('mock-s3-bucket.s3.amazonaws.com')) {
          logger.info(`Simulating PDF text extraction for mock URL: ${resource.fileUrl}`);
          pages = [
            {
              pageNumber: 1,
              content:
                'This is page 1 content. The Learning Vault handles PDF and Image files, and in this milestone, we extract plain text page-by-page. After text extraction, the text is split into semantic chunks. Chunks are about 800-1000 characters in size and maintain paragraph boundaries where possible. This is a very clean system.',
              wordCount: 52,
            },
            {
              pageNumber: 2,
              content:
                'This is page 2 content. We are storing these extracted pages inside the ResourceContent table in PostgreSQL. The chunks are stored in the ResourceChunk table. Status transitions from UPLOADED to PROCESSING, and then to READY once extraction is complete. If anything fails, it will transition to FAILED. The frontend will poll this status.',
              wordCount: 51,
            },
          ];
        } else {
          let pdfBuffer;
          if (resource.fileUrl.includes('/public/uploads/')) {
            logger.info(`Reading local PDF file directly: ${resource.fileUrl}`);
            const fileName = path.basename(resource.fileUrl);
            const filePath = path.join(process.cwd(), 'public/uploads', fileName);
            pdfBuffer = await fs.promises.readFile(filePath);
          } else {
            logger.info(`Downloading real PDF from URL: ${resource.fileUrl}`);
            const response = await axios.get(resource.fileUrl, { responseType: 'arraybuffer' });
            pdfBuffer = Buffer.from(response.data);
          }

          const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
          const parsed = await parser.getText();

          pages = parsed.pages.map((p) => {
            const content = p.text.trim();
            return {
              pageNumber: p.num,
              content,
              wordCount: content.split(/\s+/).filter(Boolean).length,
            };
          });
        }

        for (const page of pages) {
          const pageChunks = chunkPageText(page.pageNumber, page.content);
          chunks.push(...pageChunks);
        }

        await this.repository.saveParsedContent(resourceId, pages, chunks);
        logger.info(`Successfully processed PDF ${resourceId}. Status set to READY.`);
      } catch (err) {
        logger.error(`Error parsing/extracting PDF ${resourceId}:`, err);
        await this.repository.updateResourceStatus(resourceId, 'FAILED');
      }
    } catch (err) {
      logger.error(`Error during processDocument for Resource ${resourceId}:`, err);
    }
  }

  async getProcessedDetails(resourceId, userId) {
    return this.repository.getProcessedDetails(resourceId, userId);
  }
}

export default new DocumentProcessingService(documentProcessingRepository);
