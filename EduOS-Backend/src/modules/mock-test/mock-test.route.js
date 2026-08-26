import { Router } from 'express';
import mockTestController from './mock-test.controller.js';

import { requireFeature } from '../../middlewares/subscription.middleware.js';

const router = Router();

router.use(requireFeature('mock_tests'));

router.post('/generate', mockTestController.generate);
router.get('/attempts', mockTestController.findAllAttempts);
router.get('/attempts/:attemptId', mockTestController.findAttempt);
router.post('/:id/submit', mockTestController.submitAttempt);

router.get('/', mockTestController.findAll);
router.get('/:id', mockTestController.findOne);
router.delete('/:id', mockTestController.delete);

export default router;
