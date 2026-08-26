import { Router } from 'express';
import { HTTP_STATUS } from '../../config/constants.config.js';
import ResponseHandler from '../../services/response.service.js';

const router = Router();

router.get('/health', (req, res) => {
  return ResponseHandler.success(
    res,
    {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    },
    'Service is healthy',
    HTTP_STATUS.OK,
  );
});

router.get('/', (req, res) => {
  return ResponseHandler.success(
    res,
    {
      name: 'EduOS API',
      version: '1.0.0',
      description: 'Modern Learning Platform Backend API',
      documentation: '/api/v1/docs',
    },
    'Welcome to EduOS API',
    HTTP_STATUS.OK,
  );
});

export default router;
