import bcrypt from 'bcryptjs';
import prisma from '../../config/database.config.js';
import config from '../../config/env.config.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';

class UserSettingsService {
  sanitizeUser(user) {
    const { passwordHash, refreshToken, ...rest } = user;
    return rest;
  }

  async getCurrent(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        className: true,
        school: true,
        email: true,
        role: true,
        avatar: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    return user;
  }

  async updateProfile(userId, { firstName, lastName, className, school, avatar }) {
    const data = {};

    if (firstName !== undefined) data.firstName = firstName.trim();
    if (lastName !== undefined) data.lastName = lastName.trim();
    if (className !== undefined) data.className = className;
    if (school !== undefined) data.school = school;
    if (avatar !== undefined) data.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.sanitizeUser(user);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect.');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return true;
  }
}

export default new UserSettingsService();
