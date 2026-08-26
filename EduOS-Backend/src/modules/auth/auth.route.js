import { Router } from 'express';
import authController from './auth.controller.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
