// ============================================================
// Winston Logger Configuration
// ============================================================

import winston from 'winston';
import { config } from './index';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.log.level,
  defaultMeta: { service: 'smartseed-api' },
  transports: [
    new winston.transports.Console({
      format: config.app.isProduction
        ? combine(timestamp(), json())
        : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),
  ],
});

export default logger;

