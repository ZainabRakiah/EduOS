import adminRepository from './admin.repository.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';

class AdminService {
  async getDashboardStats() {
    return adminRepository.getDashboardStats();
  }

  async getUsers(filters) {
    return adminRepository.getUsers(filters);
  }

  async getUserById(id) {
    const user = await adminRepository.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user;
  }

  async toggleUserStatus(id, { status, adminId }) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestError('Invalid user status.');
    }

    const user = await adminRepository.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (user.profile.id === adminId) {
      throw new BadRequestError('You cannot deactivate your own account.');
    }

    const updatedUser = await adminRepository.updateUserStatus(id, status);

    const desc = status === 'ACTIVE' 
      ? `Activated user account: ${updatedUser.firstName} ${updatedUser.lastName}`
      : `Deactivated user account: ${updatedUser.firstName} ${updatedUser.lastName}`;

    await adminRepository.createAuditLog({
      adminId,
      action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      targetUserId: id,
      description: desc,
    });

    return updatedUser;
  }

  async getSubscriptions(filters) {
    return adminRepository.getSubscriptions(filters);
  }

  async updateSubscription(userId, { plan, status, endDate, adminId }) {
    if (!['FREE', 'PREMIUM'].includes(plan)) {
      throw new BadRequestError('Invalid subscription plan.');
    }
    if (!['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(status)) {
      throw new BadRequestError('Invalid subscription status.');
    }

    const user = await adminRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    let parsedEndDate = null;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestError('Invalid end date.');
      }
    }

    const sub = await adminRepository.updateSubscription(userId, {
      plan,
      status,
      endDate: parsedEndDate,
      adminId,
    });

    const desc = `Modified subscription for ${user.profile.firstName} ${user.profile.lastName}: Plan=${plan}, Status=${status}, EndDate=${endDate || 'Unlimited'}`;

    await adminRepository.createAuditLog({
      adminId,
      action: 'SUBSCRIPTION_MANAGED',
      targetUserId: userId,
      description: desc,
    });

    return sub;
  }

  async getAnalytics(filters) {
    return adminRepository.getAnalytics(filters);
  }

  async getAuditLogs(filters) {
    return adminRepository.getAuditLogs(filters);
  }
}

export default new AdminService();
