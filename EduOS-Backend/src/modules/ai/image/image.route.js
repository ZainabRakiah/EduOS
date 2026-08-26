import { Router } from 'express';
import imageController from './image.controller.js';
import { validate } from '../../../middlewares/validation.middleware.js';
import { generateImageSchema } from './image.validator.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { logAiUsage } from '../../../middlewares/aiUsage.middleware.js';

const router = Router();

router.post('/generate', authenticate, logAiUsage('IMAGE_GENERATE'), validate(generateImageSchema), imageController.generate);

export default router;
