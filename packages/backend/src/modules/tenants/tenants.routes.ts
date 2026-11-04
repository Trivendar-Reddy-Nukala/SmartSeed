// ============================================================
// Tenants Routes (Platform Admin only)
// ============================================================

import { Router } from 'express';
import { tenantsController } from './tenants.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { updateTenantSchema, updateTenantStatusSchema } from './tenants.validation';
import { UserRole } from '@smartseed/shared';

const router = Router();

router.use(authenticate, authorize(UserRole.PLATFORM_ADMIN));

router.get('/', (req, res, next) => tenantsController.list(req, res, next));
router.get('/:id', (req, res, next) => tenantsController.getById(req, res, next));
router.put('/:id', validate(updateTenantSchema), (req, res, next) => tenantsController.update(req, res, next));
router.patch('/:id/status', validate(updateTenantStatusSchema), (req, res, next) => tenantsController.updateStatus(req, res, next));
router.delete('/:id', (req, res, next) => tenantsController.delete(req, res, next));

export default router;

