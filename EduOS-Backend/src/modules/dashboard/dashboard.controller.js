import BaseController from '../../shared/controllers/base.controller.js';
import dashboardService from './dashboard.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class DashboardController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  getStats = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const days = req.query.days ? parseInt(req.query.days, 10) : 7;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    const [stats, chart, recentActivity] = await Promise.all([
      this.service.getStats(userId),
      this.service.getLearningChart(userId, days),
      this.service.getRecentActivity(userId, limit),
    ]);

    return ResponseHandler.success(
      res,
      { stats, chart, recentActivity },
      'Dashboard data loaded successfully.',
    );
  });
}

export default new DashboardController(dashboardService);
