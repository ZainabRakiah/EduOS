import { Router } from 'express';
import adminController from './admin.controller.js';
import { authenticate, requireSuperAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// Apply security shield globally on all super admin control endpoints
router.use(authenticate, requireSuperAdmin);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/subscriptions', adminController.getSubscriptions);
router.patch('/subscriptions/:userId', adminController.updateSubscription);
router.get('/analytics', adminController.getAnalytics);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
