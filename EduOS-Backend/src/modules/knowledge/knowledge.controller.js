import BaseController from '../../shared/controllers/base.controller.js';
import knowledgeService from './knowledge.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class KnowledgeController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  create = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const result = await this.service.createKnowledge(userId, req.body);
    return ResponseHandler.created(res, result, 'Knowledge topic created successfully.');
  });

  findAll = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { search, type, status, subject, page, limit, sortBy, sortOrder } = req.query;
    const tags = req.query.tags
      ? Array.isArray(req.query.tags)
        ? req.query.tags
        : [req.query.tags]
      : undefined;
    const filters = { search, type, status, subject, tags };
    const pagination = { page, limit, sortBy, sortOrder };
    const result = await this.service.getAll(userId, filters, pagination);
    return ResponseHandler.success(res, result, 'Knowledge topics retrieved successfully.');
  });

  findOne = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const result = await this.service.getById(id, userId);
    return ResponseHandler.success(res, result, 'Knowledge topic retrieved successfully.');
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const result = await this.service.update(id, userId, req.body);
    return ResponseHandler.success(res, result, 'Knowledge topic updated successfully.');
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    await this.service.delete(id, userId);
    return ResponseHandler.noContent(res);
  });
}

export default new KnowledgeController(knowledgeService);
