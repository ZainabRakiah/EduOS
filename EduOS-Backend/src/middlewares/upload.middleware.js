import multer from 'multer';
import { BadRequestError } from '../shared/errors/AppError.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError('Unsupported file type. Only PDF, PNG, JPG, and JPEG are allowed.'),
      false,
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
  fileFilter,
});

export const uploadMiddleware = (req, res, next) => {
  const multerUpload = upload.single('file');
  multerUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('File size exceeds the 20 MB limit.'));
      }
      return next(new BadRequestError(err.message));
    } else if (err) {
      return next(err);
    }
    next();
  });
};
