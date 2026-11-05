// ============================================================
// Notifications Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', isRead } = req.query;
      const result = await notificationsService.list(req.user!.userId, Number(page), Number(pageSize), isRead as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await notificationsService.getUnreadCount(req.user!.userId);
      res.json({ success: true, data: { unreadCount: count } });
    } catch (error) { next(error); }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationsService.markAsRead(req.params.id as string, req.user!.userId);
      res.json({ success: true, data: { message: 'Notification marked as read' } });
    } catch (error) { next(error); }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationsService.markAllAsRead(req.user!.userId);
      res.json({ success: true, data: { message: 'All notifications marked as read' } });
    } catch (error) { next(error); }
  }
}

export const notificationsController = new NotificationsController();

