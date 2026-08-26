import BaseController from '../../shared/controllers/base.controller.js';
import documentProcessingService from './document-processing.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import logger from '../../services/logger.service.js';

class DocumentProcessingController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  process = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;

    // Trigger asynchronously (non-blocking)
    this.service.processDocument(resourceId).catch((err) => {
      logger.error(`Async manual process failed for ${resourceId}:`, err);
    });

    return ResponseHandler.success(res, null, 'Document processing started in background.');
  });

  findOne = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { resourceId } = req.params;

    const result = await this.service.getProcessedDetails(resourceId, userId);
    if (!result) {
      throw new NotFoundError('Resource not found.');
    }

    return ResponseHandler.success(
      res,
      result,
      'Document processing details retrieved successfully.',
    );
  });
}

export default new DocumentProcessingController(documentProcessingService);
