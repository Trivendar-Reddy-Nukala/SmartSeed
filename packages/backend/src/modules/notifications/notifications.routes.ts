// ============================================================
// Notifications Routes
// ============================================================

import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => notificationsController.list(req, res, next));
router.get('/unread-count', (req, res, next) => notificationsController.getUnreadCount(req, res, next));
router.patch('/:id/read', (req, res, next) => notificationsController.markAsRead(req, res, next));
router.patch('/read-all', (req, res, next) => notificationsController.markAllAsRead(req, res, next));

export default router;

