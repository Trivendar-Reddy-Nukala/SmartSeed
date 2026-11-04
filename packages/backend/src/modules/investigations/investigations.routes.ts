// ============================================================
// Investigations Routes
// ============================================================

import { Router } from 'express';
import { investigationsController } from './investigations.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantContext, requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validation';
import { createInvestigationSchema, updateInvestigationStatusSchema, assignInvestigationSchema } from './investigations.validation';
import { UserRole } from '@smartseed/shared';

const router = Router();
router.use(authenticate, tenantContext, requireTenant);

router.get('/', (req, res, next) => investigationsController.list(req, res, next));
router.get('/:id', (req, res, next) => investigationsController.getById(req, res, next));
router.post('/', authorize(UserRole.PLATFORM_ADMIN, UserRole.MANUFACTURER, UserRole.AUDITOR), validate(createInvestigationSchema), (req, res, next) => investigationsController.create(req, res, next));
router.patch('/:id/status', authorize(UserRole.PLATFORM_ADMIN, UserRole.MANUFACTURER, UserRole.AUDITOR), validate(updateInvestigationStatusSchema), (req, res, next) => investigationsController.updateStatus(req, res, next));
router.patch('/:id/assign', authorize(UserRole.PLATFORM_ADMIN, UserRole.MANUFACTURER), validate(assignInvestigationSchema), (req, res, next) => investigationsController.assign(req, res, next));
router.post('/:id/report', authorize(UserRole.PLATFORM_ADMIN, UserRole.MANUFACTURER, UserRole.AUDITOR), (req, res, next) => investigationsController.generateReport(req, res, next));

export default router;

