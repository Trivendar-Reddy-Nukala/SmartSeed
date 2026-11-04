// ============================================================
// Risk Routes
// ============================================================

import { Router } from 'express';
import { riskController } from './risk.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantContext, requireTenant } from '../../middleware/tenant';
import { UserRole } from '@smartseed/shared';

const router = Router();
router.use(authenticate, tenantContext, requireTenant);

router.get('/dashboard', (req, res, next) => riskController.getDashboard(req, res, next));
router.get('/batches', (req, res, next) => riskController.getBatchesWithRisk(req, res, next));
router.get('/batch/:batchId', (req, res, next) => riskController.getBatchRisk(req, res, next));
router.post('/assess/:batchId', authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), (req, res, next) => riskController.assessBatch(req, res, next));

export default router;

