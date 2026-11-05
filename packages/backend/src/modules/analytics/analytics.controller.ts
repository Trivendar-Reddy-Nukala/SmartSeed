// ============================================================
// Analytics Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';

export class AnalyticsController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getOverview(req.tenantId, req.user?.userId, req.user?.role);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getSupplyChainMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getSupplyChainMetrics(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getRiskMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getRiskMetrics(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const analyticsController = new AnalyticsController();

