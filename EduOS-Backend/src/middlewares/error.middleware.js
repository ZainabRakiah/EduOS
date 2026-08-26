import { HTTP_STATUS } from '../config/constants.config.js';
import logger from '../services/logger.service.js';

export function notFoundHandler(req, res, next) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    errorCode: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let details = err.details || null;

  if (!err.isOperational) {
    logger.error('Unexpected error:', err);
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    message = process.env.NODE_ENV === 'production' ? 'Something went wrong' : message;
  }

  if (err.name === 'PrismaClientValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Database validation error';
    errorCode = 'DATABASE_VALIDATION_ERROR';
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      statusCode = HTTP_STATUS.CONFLICT;
      message = 'Unique constraint violation';
      errorCode = 'UNIQUE_CONFLICT';
    } else if (err.code === 'P2025') {
      statusCode = HTTP_STATUS.NOT_FOUND;
      message = 'Record not found';
      errorCode = 'RECORD_NOT_FOUND';
    } else {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      errorCode = 'DATABASE_ERROR';
    }
  }

  if (err.name === 'ZodError' || err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = 'VALIDATION_ERROR';
    details = err.details || err.message;
  }

  const errorResponse = {
    success: false,
    message,
    errorCode,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  } else if (statusCode >= 400) {
    logger.warn(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  return res.status(statusCode).json(errorResponse);
}
