// ============================================================
// Products Routes
// ============================================================

import { Router } from 'express';
import { productsController } from './products.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantContext, requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validation';
import { createProductSchema, updateProductSchema } from './products.validation';
import { UserRole } from '@smartseed/shared';

const router = Router();
router.use(authenticate, tenantContext, requireTenant);

router.get('/', (req, res, next) => productsController.list(req, res, next));
router.get('/:id', (req, res, next) => productsController.getById(req, res, next));
router.post('/', authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), validate(createProductSchema), (req, res, next) => productsController.create(req, res, next));
router.put('/:id', authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), validate(updateProductSchema), (req, res, next) => productsController.update(req, res, next));
router.delete('/:id', authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), (req, res, next) => productsController.delete(req, res, next));

export default router;

