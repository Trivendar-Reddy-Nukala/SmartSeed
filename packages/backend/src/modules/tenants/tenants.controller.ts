// ============================================================
// Tenants Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { tenantsService } from './tenants.service';
import { auditService } from '../audit/audit.service';

export class TenantsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', search } = req.query;
      const result = await tenantsService.list(Number(page), Number(pageSize), search as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantsService.getById(req.params.id);
      res.json({ success: true, data: tenant });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantsService.update(req.params.id, req.body);
      await auditService.log({ userId: req.user!.userId, action: 'UPDATE_TENANT', entityType: 'tenant', entityId: req.params.id, newValues: req.body });
      res.json({ success: true, data: tenant });
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantsService.updateStatus(req.params.id, req.body.status);
      await auditService.log({ userId: req.user!.userId, action: 'UPDATE_TENANT_STATUS', entityType: 'tenant', entityId: req.params.id, newValues: { status: req.body.status } });
      res.json({ success: true, data: tenant });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await tenantsService.delete(req.params.id);
      await auditService.log({ userId: req.user!.userId, action: 'DELETE_TENANT', entityType: 'tenant', entityId: req.params.id });
      res.json({ success: true, data: { message: 'Tenant deleted' } });
    } catch (error) { next(error); }
  }
}

export const tenantsController = new TenantsController();

