import { Router } from 'express';
import documentProcessingController from './document-processing.controller.js';
import { validate } from '../../middlewares/validation.middleware.js';
import {
  processResourceSchema,
  getProcessedDetailsSchema,
} from './document-processing.validator.js';

const router = Router();

router.post(
  '/process/:resourceId',
  validate(processResourceSchema),
  documentProcessingController.process,
);
router.get(
  '/:resourceId',
  validate(getProcessedDetailsSchema),
  documentProcessingController.findOne,
);

export default router;
