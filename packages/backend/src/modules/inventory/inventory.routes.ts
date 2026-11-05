// ============================================================
// Inventory Routes
// ============================================================

import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/auth';
import { tenantContext } from '../../middleware/tenant';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', (req, res, next) => inventoryController.list(req, res, next));
router.get('/my-batches', (req, res, next) => inventoryController.getMyAvailableBatches(req, res, next));
router.get('/summary', (req, res, next) => inventoryController.getSummary(req, res, next));

export default router;

