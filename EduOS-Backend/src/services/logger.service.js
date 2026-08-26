import winston from 'winston';
import config from '../config/env.config.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`,
  ),
);

const transports = [
  new winston.transports.Console({
    handleExceptions: true,
    handleRejections: true,
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    handleExceptions: true,
  }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

const logger = winston.createLogger({
  level: config.logging.level || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

export default logger;
