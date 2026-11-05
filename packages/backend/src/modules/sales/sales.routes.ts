import { Router } from 'express';
import { salesController } from './sales.controller';
import { authenticate } from '../../middleware/auth';
import { tenantContext, requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validation';
import { createSaleSchema } from './sales.validation';

const router = Router();

router.use(authenticate, tenantContext, requireTenant);

router.get('/', (req, res, next) => salesController.list(req, res, next));
router.get('/available-batches', (req, res, next) => salesController.getAvailableBatches(req, res, next));
router.post('/', validate(createSaleSchema), (req, res, next) => salesController.create(req, res, next));

export default router;

