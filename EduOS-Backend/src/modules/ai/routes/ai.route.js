import { Router } from 'express';
import aiController from '../controllers/ai.controller.js';
import imageRoutes from '../image/image.route.js';
import { validate } from '../../../middlewares/validation.middleware.js';
import { chatSchema, explainSchema } from '../validators/ai.validator.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { requireFeature } from '../../../middlewares/subscription.middleware.js';
import { logAiUsage } from '../../../middlewares/aiUsage.middleware.js';

const router = Router();

router.get('/health', aiController.healthCheck);
router.post('/chat', authenticate, requireFeature('ai_explainer'), logAiUsage('CHAT'), validate(chatSchema), aiController.chat);
router.post('/explain', authenticate, requireFeature('ai_explainer'), logAiUsage('EXPLAIN'), validate(explainSchema), aiController.explain);
router.post('/extract-points', authenticate, requireFeature('ai_explainer'), logAiUsage('EXTRACT_POINTS'), aiController.extractPoints);
router.use('/image', authenticate, requireFeature('ai_explainer'), imageRoutes);

export default router;
