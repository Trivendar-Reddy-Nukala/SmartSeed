// ============================================================
// Transfers Routes
// ============================================================

import { Router } from 'express';
import { transfersController } from './transfers.controller';
import { authenticate } from '../../middleware/auth';
import { tenantContext, requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validation';
import { createTransferSchema } from './transfers.validation';

const router = Router();
router.use(authenticate, tenantContext, requireTenant);

router.get('/', (req, res, next) => transfersController.list(req, res, next));
router.get('/:id', (req, res, next) => transfersController.getById(req, res, next));
router.post('/', validate(createTransferSchema), (req, res, next) => transfersController.create(req, res, next));
router.patch('/:id/dispatch', (req, res, next) => transfersController.dispatch(req, res, next));
router.patch('/:id/receive', (req, res, next) => transfersController.receive(req, res, next));
router.patch('/:id/reject', (req, res, next) => transfersController.reject(req, res, next));

export default router;

