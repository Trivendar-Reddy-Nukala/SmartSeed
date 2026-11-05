// ============================================================
// Investigations Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { investigationsService } from './investigations.service';
import { auditService } from '../audit/audit.service';

export class InvestigationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', status } = req.query;
      const result = await investigationsService.list(req.tenantId!, Number(page), Number(pageSize), status as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const inv = await investigationsService.getById(req.params.id as string, req.tenantId!);
      res.json({ success: true, data: inv });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const inv = await investigationsService.create(req.tenantId!, req.body);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'CREATE_INVESTIGATION', entityType: 'investigation', entityId: inv.id, newValues: req.body });
      res.status(201).json({ success: true, data: inv });
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const invId = req.params.id as string;
      const inv = await investigationsService.updateStatus(invId, req.tenantId!, req.user!.userId, req.body.status, req.body.resolution);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'UPDATE_INVESTIGATION_STATUS', entityType: 'investigation', entityId: invId, newValues: req.body });
      res.json({ success: true, data: inv });
    } catch (error) { next(error); }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const invId = req.params.id as string;
      const inv = await investigationsService.assign(invId, req.tenantId!, req.body.assignedTo);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'ASSIGN_INVESTIGATION', entityType: 'investigation', entityId: invId, newValues: req.body });
      res.json({ success: true, data: inv });
    } catch (error) { next(error); }
  }

  async generateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await investigationsService.generateReport(req.params.id as string, req.tenantId!);
      res.json({ success: true, data: report });
    } catch (error) { next(error); }
  }
}

export const investigationsController = new InvestigationsController();

