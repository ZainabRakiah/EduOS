import { HTTP_STATUS, ERROR_CODES } from '../../config/constants.config.js';

class AppError extends Error {
  constructor(statusCode, message, errorCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(HTTP_STATUS.BAD_REQUEST, message, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = null) {
    super(HTTP_STATUS.UNAUTHORIZED, message, ERROR_CODES.AUTHENTICATION_ERROR, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = null) {
    super(HTTP_STATUS.FORBIDDEN, message, ERROR_CODES.AUTHORIZATION_ERROR, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(HTTP_STATUS.NOT_FOUND, message, ERROR_CODES.NOT_FOUND_ERROR, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(HTTP_STATUS.CONFLICT, message, ERROR_CODES.CONFLICT_ERROR, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', details = null) {
    super(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, ERROR_CODES.INTERNAL_ERROR, details);
  }
}

export default AppError;
