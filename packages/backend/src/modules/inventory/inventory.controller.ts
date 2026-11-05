// ============================================================
// Inventory Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';

export class InventoryController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '50', search, batchId, scope } = req.query;
      const result = await inventoryService.list({
        tenantId: req.tenantId,
        userId: req.user!.userId,
        userRole: req.user!.role,
        page: Number(page),
        pageSize: Number(pageSize),
        search: search as string,
        batchId: batchId as string,
        scope: scope as 'my' | 'network',
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getMyAvailableBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const batches = await inventoryService.getMyAvailableBatches(req.tenantId, req.user!.userId);
      res.json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await inventoryService.getSummary(req.tenantId, req.user!.userId, req.user!.role);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();

