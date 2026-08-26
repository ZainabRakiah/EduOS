import prisma from '../config/database.config.js';
import { FEATURES } from '../config/features.config.js';

export const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.sub) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please sign in.',
        });
      }

      const userId = req.user.sub;

      // Get current subscription
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

      const feat = Object.values(FEATURES).find((f) => f.key === featureKey);
      if (!feat) {
        return res.status(400).json({
          success: false,
          message: `Unknown feature key requested: ${featureKey}`,
        });
      }

      const hasAccess = feat.requiredPlan === 'FREE' || currentPlan === 'PREMIUM';

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          code: 'FEATURE_REQUIRES_PREMIUM',
          message: `${feat.name} is available with a Premium subscription.`,
        });
      }

      // Attach access data to request object
      req.subscription = subscription;
      req.userPlan = currentPlan;

      next();
    } catch (error) {
      next(error);
    }
  };
};
