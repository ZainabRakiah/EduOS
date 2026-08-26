import createApp from './app.js';
import config from './config/env.config.js';
import logger from './services/logger.service.js';
import { connectDatabase, disconnectDatabase } from './config/database.config.js';

const app = createApp();

const server = app.listen(config.port, async () => {
  logger.info('='.repeat(60));
  logger.info(`  EduOS Backend Server`);
  logger.info(`  Environment: ${config.env}`);
  logger.info(`  Port: ${config.port}`);
  logger.info(`  API Prefix: ${config.apiPrefix}`);
  logger.info(`  URL: http://localhost:${config.port}`);
  logger.info('='.repeat(60));

  await connectDatabase();
});

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDatabase();
    logger.info('Graceful shutdown completed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
