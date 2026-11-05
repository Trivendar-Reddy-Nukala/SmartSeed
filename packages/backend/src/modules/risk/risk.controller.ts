// ============================================================
// Risk Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { riskService } from './risk.service';

export class RiskController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await riskService.getDashboard(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getBatchesWithRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', riskLevel } = req.query;
      const result = await riskService.getBatchesWithRisk(req.tenantId!, Number(page), Number(pageSize), riskLevel as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getBatchRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await riskService.getBatchRisk(req.params.batchId as string, req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async assessBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await riskService.assessBatch(req.params.batchId as string, req.tenantId!);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const riskController = new RiskController();

