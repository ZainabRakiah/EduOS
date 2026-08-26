import BaseRepository from '../../shared/repositories/base.repository.js';
import prisma from '../../config/database.config.js';

class AuthRepository extends BaseRepository {
  constructor() {
    super('user', prisma);
    this.prisma = prisma;
  }

  async findByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async createUser(data) {
    return this.prisma.user.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        className: data.className,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        role: data.role || 'STUDENT',
        subscription: {
          create: {
            plan: data.plan || 'FREE',
            status: 'ACTIVE',
          },
        },
      },
    });
  }

  async updateLastLogin(userId) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async setRefreshToken(userId, refreshToken) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async findById(id) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        className: true,
        email: true,
        role: true,
        avatar: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export default new AuthRepository();
