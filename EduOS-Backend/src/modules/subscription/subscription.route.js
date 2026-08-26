import { Router } from 'express';
import subscriptionController from './subscription.controller.js';

const router = Router();

router.get('/me', subscriptionController.getMe);

export default router;
