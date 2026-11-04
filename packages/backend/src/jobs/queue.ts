// ============================================================
// Job Queue Configuration (BullMQ)
// ============================================================

import { Queue } from 'bullmq';
import { config } from '../config';

const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
};

export const riskAssessmentQueue = new Queue('risk-assessment', { connection: redisConnection });
export const notificationQueue = new Queue('notifications', { connection: redisConnection });
export const blockchainSyncQueue = new Queue('blockchain-sync', { connection: redisConnection });

