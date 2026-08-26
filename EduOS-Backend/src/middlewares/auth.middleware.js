import asyncHandler from '../utils/asyncHandler.util.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/AppError.js';
import authService from '../modules/auth/auth.service.js';
import prisma from '../config/database.config.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !String(header).startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required. No token provided.');
  }

  const token = String(header).slice(7);
  let payload;
  try {
    payload = authService.verifyToken(token);
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError'
        ? 'Session expired. Please sign in again.'
        : 'Invalid token. Please sign in again.';
    throw new UnauthorizedError(msg);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { status: true, role: true },
  });

  if (!dbUser) {
    throw new UnauthorizedError('User account not found.');
  }

  if (dbUser.status === 'INACTIVE') {
    throw new ForbiddenError('Your account has been deactivated. Please contact support.');
  }

  req.user = {
    ...payload,
    role: dbUser.role,
  };
  next();
});

export const authorize = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }
    if (roles.length && !roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to access this resource.');
    }
    next();
  });

export const requireSuperAdmin = authorize('SUPER_ADMIN');

