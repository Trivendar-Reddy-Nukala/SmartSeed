// ============================================================
// QR Routes
// ============================================================

import { Router } from 'express';
import { qrController } from './qr.controller';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { tenantContext, requireTenant } from '../../middleware/tenant';
import { validate } from '../../middleware/validation';
import { generateQrSchema } from './qr.validation';
import { UserRole } from '@smartseed/shared';

const router = Router();

// Public verification endpoint — no auth required
router.get('/verify/:publicToken', optionalAuth, (req, res, next) => qrController.verify(req, res, next));

// Authenticated endpoints
router.post('/generate', authenticate, tenantContext, requireTenant, authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), validate(generateQrSchema), (req, res, next) => qrController.generate(req, res, next));
router.get('/batch/:batchId', authenticate, tenantContext, requireTenant, (req, res, next) => qrController.listByBatch(req, res, next));
router.post('/:id/revoke', authenticate, tenantContext, requireTenant, authorize(UserRole.MANUFACTURER, UserRole.PLATFORM_ADMIN), (req, res, next) => qrController.revoke(req, res, next));
router.get('/:id/scans', authenticate, tenantContext, requireTenant, (req, res, next) => qrController.getScanHistory(req, res, next));

export default router;

