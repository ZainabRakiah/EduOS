import BaseController from '../../../shared/controllers/base.controller.js';
import chapterExplainerService from '../services/chapter-explainer.service.js';
import ResponseHandler from '../../../services/response.service.js';
import asyncHandler from '../../../utils/asyncHandler.util.js';

class ChapterExplainerController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  upload = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const result = await this.service.createExplanation(userId, req.body, req.file);
    return ResponseHandler.created(
      res,
      result,
      'Chapter uploaded successfully. Explanation is processing.',
    );
  });

  findAll = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { page, limit } = req.query;
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    const result = await this.service.getExplanations(userId, pagination);
    return ResponseHandler.success(res, result, 'Recent explanations retrieved successfully.');
  });

  findOne = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const result = await this.service.getExplanationById(id, userId);
    return ResponseHandler.success(res, result, 'Explanation retrieved successfully.');
  });
}

export default new ChapterExplainerController(chapterExplainerService);
