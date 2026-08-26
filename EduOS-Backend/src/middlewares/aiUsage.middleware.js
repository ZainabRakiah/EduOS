import prisma from '../config/database.config.js';

export const logAiUsage = (featureName) => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.sub) {
        try {
          await prisma.aiUsage.create({
            data: {
              userId: req.user.sub,
              feature: featureName,
              promptTokens: 0,
              completionTokens: 0,
              cost: 0.0,
            },
          });
        } catch (err) {
          console.error(`Failed to log AI usage for ${featureName}:`, err);
        }
      }
    });
    next();
  };
};
