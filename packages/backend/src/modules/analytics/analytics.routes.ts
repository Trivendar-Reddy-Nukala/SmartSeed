// ============================================================
// Analytics Routes
// ============================================================

import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth';
import { tenantContext } from '../../middleware/tenant';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/overview', (req, res, next) => analyticsController.getOverview(req, res, next));
router.get('/supply-chain', (req, res, next) => analyticsController.getSupplyChainMetrics(req, res, next));
router.get('/risk', (req, res, next) => analyticsController.getRiskMetrics(req, res, next));

export default router;

