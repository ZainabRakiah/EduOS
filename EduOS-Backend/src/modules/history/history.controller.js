import BaseController from '../../shared/controllers/base.controller.js';
import historyService from './history.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class HistoryController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  getRecentActivities = asyncHandler(async (req, res) => {
    const activities = await this.service.getRecentActivities(req.user.sub, 20);
    return ResponseHandler.success(res, activities, 'Recent activities loaded.');
  });

  getViewed = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const activities = await this.service.getViewed(req.user.sub, limit);
    return ResponseHandler.success(res, activities, 'Viewed history loaded.');
  });

  getEdited = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const activities = await this.service.getEdited(req.user.sub, limit);
    return ResponseHandler.success(res, activities, 'Edited history loaded.');
  });

  getUploaded = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const activities = await this.service.getUploaded(req.user.sub, limit);
    return ResponseHandler.success(res, activities, 'Upload history loaded.');
  });

  getStudyHistoryChart = asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : 7;
    const chart = await this.service.getStudyHistoryChart(req.user.sub, days);
    return ResponseHandler.success(res, chart, 'Study history chart loaded.');
  });
}

export default new HistoryController(historyService);
