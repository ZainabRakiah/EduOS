import { Router } from 'express';
import historyController from './history.controller.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { queryLimitSchema, queryDaysSchema } from './history.validation.js';

const router = Router();

router.get('/recent', historyController.getRecentActivities);
router.get('/viewed', validate(queryLimitSchema), historyController.getViewed);
router.get('/edited', validate(queryLimitSchema), historyController.getEdited);
router.get('/uploaded', validate(queryLimitSchema), historyController.getUploaded);
router.get('/study-chart', validate(queryDaysSchema), historyController.getStudyHistoryChart);

export default router;
