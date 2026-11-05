// ============================================================
// SmartSeed API — Main Application Entry Point
// ============================================================

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import http from 'http';

import { config } from './config';
import logger from './config/logger';
import { testConnection } from './database/connection';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { initWebSocket } from './websocket';
import { startWorkers } from './jobs/workers';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import tenantRoutes from './modules/tenants/tenants.routes';
import userRoutes from './modules/users/users.routes';
import productRoutes from './modules/products/products.routes';
import batchRoutes from './modules/batches/batches.routes';
import transferRoutes from './modules/transfers/transfers.routes';
import qrRoutes from './modules/qr/qr.routes';
import riskRoutes from './modules/risk/risk.routes';
import investigationRoutes from './modules/investigations/investigations.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import salesRoutes from './modules/sales/sales.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';

const app = express();
const server = http.createServer(app);

// ---- Global Middleware ----
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('short', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(apiLimiter);

// ---- Health Check ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'smartseed-api', timestamp: new Date().toISOString() });
});

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);

// ---- Error Handling ----
app.use(notFoundHandler);
app.use(errorHandler);

// ---- Initialize WebSocket ----
initWebSocket(server);

// ---- Start Server ----
async function start() {
  try {
    await testConnection();
    logger.info('Database connected');

    // Start background workers
    try {
      startWorkers();
    } catch (err) {
      logger.warn('Background workers failed to start (Redis may be unavailable)', { error: (err as Error).message });
    }

    server.listen(config.app.port, () => {
      logger.info(`🌱 SmartSeed API running on port ${config.app.port}`);
      logger.info(`   Environment: ${config.app.nodeEnv}`);
      logger.info(`   Blockchain: ${config.blockchain.simulation ? 'SIMULATION' : 'LIVE'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  server.close(() => process.exit(0));
});

start();

export default app;

