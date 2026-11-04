// ============================================================
// Job Workers (BullMQ)
// ============================================================

import { Worker } from 'bullmq';
import { config } from '../config';
import { riskService } from '../modules/risk/risk.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import logger from '../config/logger';

const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
};

export function startWorkers(): void {
  // Risk assessment worker
  new Worker('risk-assessment', async (job) => {
    const { batchId, tenantId } = job.data;
    logger.info('Processing risk assessment', { batchId, tenantId });
    await riskService.assessBatch(batchId, tenantId);
  }, { connection: redisConnection, concurrency: 5 });

  // Notification worker
  new Worker('notifications', async (job) => {
    const { tenantId, userId, title, message, sendEmail, data } = job.data;
    await notificationsService.create({ tenantId, userId, title, message, sendEmail, data });
  }, { connection: redisConnection, concurrency: 10 });

  logger.info('Job workers started');
}

