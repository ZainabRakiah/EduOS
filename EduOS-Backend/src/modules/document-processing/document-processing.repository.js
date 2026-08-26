import BaseRepository from '../../shared/repositories/base.repository.js';
import prisma from '../../config/database.config.js';

class DocumentProcessingRepository extends BaseRepository {
  constructor() {
    super('resource', prisma);
    this.prisma = prisma;
  }

  async updateResourceStatus(resourceId, status) {
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: { status },
    });
  }

  async saveParsedContent(resourceId, pages, chunks) {
    return this.prisma.$transaction(async (tx) => {
      await tx.resourceContent.deleteMany({ where: { resourceId } });
      await tx.resourceChunk.deleteMany({ where: { resourceId } });

      if (pages.length > 0) {
        await tx.resourceContent.createMany({
          data: pages.map((page) => ({
            resourceId,
            pageNumber: page.pageNumber,
            content: page.content,
            wordCount: page.wordCount,
          })),
        });
      }

      if (chunks.length > 0) {
        await tx.resourceChunk.createMany({
          data: chunks.map((chunk) => ({
            resourceId,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            chunkText: chunk.chunkText,
          })),
        });
      }

      return tx.resource.update({
        where: { id: resourceId },
        data: { status: 'READY' },
      });
    });
  }

  async getProcessedDetails(resourceId, userId) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId, userId },
      include: {
        _count: {
          select: {
            contents: true,
            chunks: true,
          },
        },
        contents: {
          select: {
            wordCount: true,
            pageNumber: true,
          },
        },
      },
    });

    if (!resource) return null;

    const totalWords = resource.contents.reduce((sum, c) => sum + (c.wordCount || 0), 0);
    const pagesCount = resource._count.contents;
    const chunksCount = resource._count.chunks;

    return {
      resource: {
        id: resource.id,
        title: resource.title,
        originalFileName: resource.originalFileName,
        fileType: resource.fileType,
        fileSize: resource.fileSize,
        mimeType: resource.mimeType,
        status: resource.status,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      },
      processingStatus: resource.status,
      pages: pagesCount,
      totalWords,
      totalChunks: chunksCount,
    };
  }
}

export default new DocumentProcessingRepository();
