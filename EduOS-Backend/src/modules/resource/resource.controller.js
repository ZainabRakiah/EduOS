import BaseController from '../../shared/controllers/base.controller.js';
import resourceService from './resource.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { BadRequestError } from '../../shared/errors/AppError.js';

class ResourceController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  upload = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new BadRequestError('No file uploaded.');
    }
    const userId = req.user.sub;
    const result = await this.service.uploadResource(userId, req.file);
    return ResponseHandler.created(res, result, 'Resource uploaded successfully.');
  });

  findAll = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const result = await this.service.getResources(userId);
    return ResponseHandler.success(
      res,
      {
        data: result,
        meta: {
          total: result.length,
          page: 1,
          limit: result.length,
          totalPages: 1,
        },
      },
      'Resources retrieved successfully.',
    );
  });

  findOne = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const result = await this.service.getResourceById(userId, id);
    return ResponseHandler.success(res, result, 'Resource retrieved successfully.');
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    await this.service.deleteResource(userId, id);
    return ResponseHandler.noContent(res);
  });
}

export default new ResourceController(resourceService);
