import { Request, Response, NextFunction } from 'express';
import { salesService } from './sales.service';
import { auditService } from '../audit/audit.service';

export class SalesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', search } = req.query;
      const result = await salesService.list(
        req.tenantId!,
        req.user!.userId,
        req.user!.role,
        Number(page),
        Number(pageSize),
        search as string,
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const batches = await salesService.getAvailableBatches(
        req.tenantId!,
        req.user!.userId,
        req.user!.role,
      );
      res.json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await salesService.create(
        req.tenantId!,
        req.user!.userId,
        req.user!.role,
        req.body,
      );

      await auditService.log({
        tenantId: req.tenantId,
        userId: req.user!.userId,
        action: 'RETAIL_SALE_TO_FARMER',
        entityType: 'retail_sales',
        entityId: sale.id,
        newValues: {
          farmerName: sale.farmer_name,
          farmerPassbookNumber: sale.farmer_passbook_number,
          quantity: sale.quantity,
          totalPrice: sale.total_price,
          receiptNumber: sale.receipt_number,
        },
      });

      res.status(201).json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  }
}

export const salesController = new SalesController();

