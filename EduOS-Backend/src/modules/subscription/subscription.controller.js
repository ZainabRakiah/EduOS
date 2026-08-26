import prisma from '../../config/database.config.js';
import { FEATURES } from '../../config/features.config.js';

class SubscriptionController {
  async getMe(req, res, next) {
    try {
      const userId = req.user.sub;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      const now = new Date();
      const isPremiumActive =
        subscription &&
        subscription.plan === 'PREMIUM' &&
        subscription.status === 'ACTIVE' &&
        (!subscription.endDate || new Date(subscription.endDate) > now);

      const currentPlan = isPremiumActive ? 'PREMIUM' : 'FREE';
      const status = subscription ? subscription.status : 'ACTIVE';

      // Build features access map
      const featuresAccess = {};
      Object.values(FEATURES).forEach((feat) => {
        featuresAccess[feat.key] = feat.requiredPlan === 'FREE' || currentPlan === 'PREMIUM';
      });

      return res.status(200).json({
        success: true,
        data: {
          plan: currentPlan,
          status: status,
          isPremium: isPremiumActive,
          features: featuresAccess,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SubscriptionController();
