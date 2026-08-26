import adminService from './admin.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class AdminController {
  getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  });

  getUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const role = req.query.role || undefined;
    const plan = req.query.plan || undefined;
    const status = req.query.status || undefined;
    const subscriptionStatus = req.query.subscriptionStatus || undefined;
    const classFilter = req.query.classFilter || undefined;

    const result = await adminService.getUsers({
      page,
      limit,
      search,
      role,
      plan,
      status,
      subscriptionStatus,
      classFilter,
    });

    res.json({
      success: true,
      data: result,
    });
  });

  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await adminService.getUserById(id);
    res.json({
      success: true,
      data: user,
    });
  });

  toggleUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.sub;

    const updatedUser = await adminService.toggleUserStatus(id, {
      status,
      adminId,
    });

    res.json({
      success: true,
      message: `User status updated to ${status} successfully.`,
      data: updatedUser,
    });
  });

  getSubscriptions = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const plan = req.query.plan || undefined;
    const status = req.query.status || undefined;

    const result = await adminService.getSubscriptions({
      page,
      limit,
      plan,
      status,
    });

    res.json({
      success: true,
      data: result,
    });
  });

  updateSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { plan, status, endDate } = req.body;
    const adminId = req.user.sub;

    const sub = await adminService.updateSubscription(userId, {
      plan,
      status,
      endDate,
      adminId,
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully.',
      data: sub,
    });
  });

  getAnalytics = asyncHandler(async (req, res) => {
    const from = req.query.from || undefined;
    const to = req.query.to || undefined;

    const analytics = await adminService.getAnalytics({ from, to });
    res.json({
      success: true,
      data: analytics,
    });
  });

  getAuditLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';

    const result = await adminService.getAuditLogs({
      page,
      limit,
      search,
    });

    res.json({
      success: true,
      data: result,
    });
  });
}

export default new AdminController();
