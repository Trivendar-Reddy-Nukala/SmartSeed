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
      const tenant = await tenantsService.getById(req.params.id as string);
      res.json({ success: true, data: tenant });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.id as string;
      const tenant = await tenantsService.update(tenantId, req.body);
      await auditService.log({ userId: req.user!.userId, action: 'UPDATE_TENANT', entityType: 'tenant', entityId: tenantId, newValues: req.body });
      res.json({ success: true, data: tenant });
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.id as string;
      const tenant = await tenantsService.updateStatus(tenantId, req.body.status);
      await auditService.log({ userId: req.user!.userId, action: 'UPDATE_TENANT_STATUS', entityType: 'tenant', entityId: tenantId, newValues: { status: req.body.status } });
      res.json({ success: true, data: tenant });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.id as string;
      await tenantsService.delete(tenantId);
      await auditService.log({ userId: req.user!.userId, action: 'DELETE_TENANT', entityType: 'tenant', entityId: tenantId });
      res.json({ success: true, data: { message: 'Tenant deleted' } });
    } catch (error) { next(error); }
  }
}

export const tenantsController = new TenantsController();

