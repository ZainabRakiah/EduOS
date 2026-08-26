import { Router } from 'express';
import multer from 'multer';
import chapterExplainerController from '../controllers/chapter-explainer.controller.js';
import { validate } from '../../../middlewares/validation.middleware.js';
import { uploadSchema } from '../validators/chapter-explainer.validator.js';
import { BadRequestError } from '../../../shared/errors/AppError.js';

import { requireFeature } from '../../../middlewares/subscription.middleware.js';

const router = Router();

router.use(requireFeature('ai_explainer'));

// Multer configuration for file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          'Invalid file type. Only PDFs and images (PNG, JPEG, WEBP) are allowed.',
        ),
      );
    }
  },
});

router.post(
  '/upload',
  upload.single('file'),
  validate(uploadSchema),
  chapterExplainerController.upload,
);

router.get('/', chapterExplainerController.findAll);
router.get('/:id', chapterExplainerController.findOne);

export default router;
