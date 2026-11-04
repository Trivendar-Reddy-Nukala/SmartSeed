// ============================================================
// Configuration Loader
// Loads environment variables and exports typed config object
// ============================================================

import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Also try local .env for overrides
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  /** Application settings */
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    webUrl: process.env.WEB_URL || 'http://localhost:5173',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },

  /** PostgreSQL database connection */
  db: {
    url: process.env.DATABASE_URL || 'postgresql://smartseed:smartseed_dev_2026@localhost:5432/smartseed_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'smartseed_dev',
    user: process.env.DB_USER || 'smartseed',
    password: process.env.DB_PASSWORD || 'smartseed_dev_2026',
    ssl: process.env.DB_SSL === 'true',
  },

  /** Redis connection */
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  /** JWT authentication */
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-to-a-secure-random-string-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  /** Hyperledger Fabric blockchain */
  blockchain: {
    channelName: process.env.HLF_CHANNEL_NAME || 'seedchannel',
    chaincodeName: process.env.HLF_CHAINCODE_NAME || 'smartseed',
    connectionProfile: process.env.HLF_CONNECTION_PROFILE || './packages/blockchain/network/connection-org1.json',
    walletPath: process.env.HLF_WALLET_PATH || './packages/blockchain/wallet',
    simulation: process.env.BLOCKCHAIN_SIMULATION !== 'false', // default true
  },

  /** AI/ML engine */
  ai: {
    engineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_ENGINE_API_KEY || 'change-this-in-production',
  },

  /** S3/MinIO object storage */
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'smartseed',
    region: process.env.S3_REGION || 'us-east-1',
  },

  /** SMTP email */
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@smartseed.example',
  },

  /** QR Code */
  qr: {
    baseUrl: process.env.QR_BASE_URL || 'http://localhost:5173/verify',
  },

  /** CORS */
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:19006').split(','),
  },

  /** Rate limiting */
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  /** Logging */
  log: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'pretty',
  },
} as const;

export default config;
