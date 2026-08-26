import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/env.config.js';
import corsMiddleware from './middlewares/cors.middleware.js';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import logger from './services/logger.service.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: config.env === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(corsMiddleware);

  app.use(compression());

  app.use(hpp());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    morgan(config.env === 'production' ? 'combined' : 'dev', {
      stream: {
        write: (message) => logger.http(message.trim()),
      },
      skip: (req, res) => req.url.includes('/health'),
    }),
  );

  app.use(`${config.apiPrefix}`, globalRateLimiter);

  app.get('/', (req, res) => {
    res.json({
      name: 'EduOS Backend',
      version: '1.0.0',
      api: config.apiPrefix,
    });
  });

  app.use(config.apiPrefix, routes);

  app.use('/public', express.static(path.join(__dirname, '../public')));

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
}

export default createApp;
