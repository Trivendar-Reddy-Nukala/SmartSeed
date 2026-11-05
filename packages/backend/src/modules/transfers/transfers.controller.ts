// ============================================================
// Transfers Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { transfersService } from './transfers.service';
import { auditService } from '../audit/audit.service';

export class TransfersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', status, batchId } = req.query;
      const result = await transfersService.list(req.tenantId, Number(page), Number(pageSize), status as string, batchId as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await transfersService.getById(req.params.id as string, req.tenantId);
      res.json({ success: true, data: transfer });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await transfersService.create(req.tenantId!, req.user!.userId, req.user!.role, req.body);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'CREATE_TRANSFER', entityType: 'transfer', entityId: transfer.id, newValues: req.body });
      res.status(201).json({ success: true, data: transfer });
    } catch (error) { next(error); }
  }

  async dispatch(req: Request, res: Response, next: NextFunction) {
    try {
      const transferId = req.params.id as string;
      const transfer = await transfersService.dispatch(transferId, req.tenantId!, req.user!.userId);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'DISPATCH_TRANSFER', entityType: 'transfer', entityId: transferId });
      res.json({ success: true, data: transfer });
    } catch (error) { next(error); }
  }

  async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const transferId = req.params.id as string;
      const transfer = await transfersService.receive(transferId, req.tenantId!, req.user!.userId);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'RECEIVE_TRANSFER', entityType: 'transfer', entityId: transferId });
      res.json({ success: true, data: transfer });
    } catch (error) { next(error); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const transferId = req.params.id as string;
      const transfer = await transfersService.reject(transferId, req.tenantId!, req.user!.userId, req.body.reason);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'REJECT_TRANSFER', entityType: 'transfer', entityId: transferId });
      res.json({ success: true, data: transfer });
    } catch (error) { next(error); }
  }
}

export const transfersController = new TransfersController();

