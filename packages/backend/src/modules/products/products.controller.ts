// ============================================================
// Products Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { auditService } from '../audit/audit.service';

export class ProductsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', search, cropType } = req.query;
      const result = await productsService.list(req.tenantId!, Number(page), Number(pageSize), search as string, cropType as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getById(req.params.id as string, req.tenantId!);
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.create(req.tenantId!, req.body);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'CREATE_PRODUCT', entityType: 'product', entityId: product.id, newValues: req.body });
      res.status(201).json({ success: true, data: product });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const product = await productsService.update(productId, req.tenantId!, req.body);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'UPDATE_PRODUCT', entityType: 'product', entityId: productId, newValues: req.body });
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      await productsService.delete(productId, req.tenantId!);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'DELETE_PRODUCT', entityType: 'product', entityId: productId });
      res.json({ success: true, data: { message: 'Product deleted' } });
    } catch (error) { next(error); }
  }
}

export const productsController = new ProductsController();

