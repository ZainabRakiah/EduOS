import { Router } from 'express';
import healthRoutes from '../modules/health/health.route.js';
import authRoutes from '../modules/auth/auth.route.js';
import dashboardRoutes from '../modules/dashboard/dashboard.route.js';
import notesRoutes from '../modules/notes/notes.route.js';
import resourcesRoutes from '../modules/resource/resource.route.js';
import knowledgeRoutes from '../modules/knowledge/knowledge.route.js';
import historyRoutes from '../modules/history/history.route.js';
import userSettingsRoutes from '../modules/user-settings/user-settings.route.js';
import chapterExplainerRoutes from '../modules/chapter-explainer/routes/chapter-explainer.route.js';
import aiRoutes from '../modules/ai/routes/ai.route.js';
import documentProcessingRoutes from '../modules/document-processing/document-processing.route.js';
import mockTestRoutes from '../modules/mock-test/mock-test.route.js';
import subscriptionRoutes from '../modules/subscription/subscription.route.js';
import adminRoutes from '../modules/admin/admin.route.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

const publicRoutes = [
  {
    path: '/',
    route: healthRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
];

publicRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

const moduleRoutes = [
  {
    path: '/dashboard',
    route: dashboardRoutes,
  },
  {
    path: '/admin',
    route: adminRoutes,
  },
  {
    path: '/notes',
    route: notesRoutes,
  },
  {
    path: '/mock-tests',
    route: mockTestRoutes,
  },
  {
    path: '/subscription',
    route: subscriptionRoutes,
  },
  {
    path: '/resources',
    route: resourcesRoutes,
  },
  {
    path: '/knowledge',
    route: knowledgeRoutes,
  },
  {
    path: '/history',
    route: historyRoutes,
  },
  {
    path: '/settings',
    route: userSettingsRoutes,
  },
  {
    path: '/chapter-explainer',
    route: chapterExplainerRoutes,
  },
  {
    path: '/ai',
    route: aiRoutes,
    public: true,
  },
  {
    path: '/document-processing',
    route: documentProcessingRoutes,
  },
];

moduleRoutes.forEach((route) => {
  if (route.public) {
    router.use(route.path, route.route);
  } else {
    router.use(route.path, authenticate, route.route);
  }
});

export default router;
