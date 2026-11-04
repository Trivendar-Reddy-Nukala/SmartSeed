// ============================================================
// Batches Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { batchesService } from './batches.service';
import { auditService } from '../audit/audit.service';

export class BatchesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', search, status, productId } = req.query;
      const result = await batchesService.list(req.tenantId!, Number(page), Number(pageSize), search as string, status as string, productId as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await batchesService.getById(req.params.id, req.tenantId!);
      res.json({ success: true, data: batch });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await batchesService.create(req.tenantId!, req.user!.userId, req.user!.role, req.body);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'CREATE_BATCH', entityType: 'seed_batch', entityId: batch.id, newValues: req.body });
      res.status(201).json({ success: true, data: batch });
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await batchesService.updateStatus(req.params.id, req.tenantId!, req.body.status);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'UPDATE_BATCH_STATUS', entityType: 'seed_batch', entityId: req.params.id, newValues: { status: req.body.status } });
      res.json({ success: true, data: batch });
    } catch (error) { next(error); }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await batchesService.getTimeline(req.params.id, req.tenantId!);
      res.json({ success: true, data: events });
    } catch (error) { next(error); }
  }

  async getPassport(req: Request, res: Response, next: NextFunction) {
    try {
      const passport = await batchesService.getPassport(req.params.id, req.tenantId!);
      res.json({ success: true, data: passport });
    } catch (error) { next(error); }
  }
}

export const batchesController = new BatchesController();

