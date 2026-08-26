import cors from 'cors';
import config from '../config/env.config.js';

const corsOptions = {
  origin: config.env === 'production' ? config.cors.origin : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition', 'X-Total-Count'],
  maxAge: 86400,
};

export default cors(corsOptions);
