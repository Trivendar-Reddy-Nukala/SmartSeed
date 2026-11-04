// ============================================================
// Users Routes
// ============================================================

import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantContext } from '../../middleware/tenant';
import { validate } from '../../middleware/validation';
import { createUserSchema, updateUserSchema } from './users.validation';
import { UserRole } from '@smartseed/shared';

const router = Router();

router.use(authenticate, tenantContext);

router.get('/', (req, res, next) => usersController.list(req, res, next));
router.get('/:id', (req, res, next) => usersController.getById(req, res, next));
router.post('/', authorize(UserRole.PLATFORM_ADMIN, UserRole.MANUFACTURER), validate(createUserSchema), (req, res, next) => usersController.create(req, res, next));
router.put('/:id', authorize(UserRole.PLATFORM_ADMIN, UserRole.MANUFACTURER), validate(updateUserSchema), (req, res, next) => usersController.update(req, res, next));
router.patch('/:id/status', authorize(UserRole.PLATFORM_ADMIN, UserRole.MANUFACTURER), (req, res, next) => usersController.updateStatus(req, res, next));

export default router;

