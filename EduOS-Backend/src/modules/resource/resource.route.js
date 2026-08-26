import { Router } from 'express';
import resourceController from './resource.controller.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { getResourceByIdSchema, deleteResourceSchema } from './resource.validator.js';
import { uploadMiddleware } from '../../middlewares/upload.middleware.js';

const router = Router();

router.post('/upload', uploadMiddleware, resourceController.upload);
router.get('/', resourceController.findAll);
router.get('/:id', validate(getResourceByIdSchema), resourceController.findOne);
router.delete('/:id', validate(deleteResourceSchema), resourceController.delete);

export default router;
