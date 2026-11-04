// ============================================================
// Batches Routes
// ============================================================

import { Router } from 'express';
import { batchesController } from './batches.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantContext, requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validation';
import { createBatchSchema, updateBatchStatusSchema } from './batches.validation';
import { UserRole } from '@smartseed/shared';

const router = Router();
router.use(authenticate, tenantContext, requireTenant);

router.get('/', (req, res, next) => batchesController.list(req, res, next));
router.get('/:id', (req, res, next) => batchesController.getById(req, res, next));
router.post('/', authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), validate(createBatchSchema), (req, res, next) => batchesController.create(req, res, next));
router.patch('/:id/status', authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), validate(updateBatchStatusSchema), (req, res, next) => batchesController.updateStatus(req, res, next));
router.get('/:id/timeline', (req, res, next) => batchesController.getTimeline(req, res, next));
router.get('/:id/passport', (req, res, next) => batchesController.getPassport(req, res, next));

export default router;

