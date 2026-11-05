// ============================================================
// QR Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { qrService } from './qr.service';
import { auditService } from '../audit/audit.service';

export class QrController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const qrCodes = await qrService.generate(req.tenantId!, req.body);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'GENERATE_QR', entityType: 'qr_code', entityId: req.body.batchId, newValues: { count: req.body.count } });
      res.status(201).json({ success: true, data: qrCodes });
    } catch (error) { next(error); }
  }

  /** Public endpoint — no auth required */
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await qrService.verify(req.params.publicToken as string, {
        latitude: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
        longitude: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        scannedBy: req.user?.userId,
      });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async listByBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const qrCodes = await qrService.listByBatch(req.params.batchId as string, req.tenantId!);
      res.json({ success: true, data: qrCodes });
    } catch (error) { next(error); }
  }

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const qrId = req.params.id as string;
      const qr = await qrService.revoke(qrId, req.tenantId!);
      await auditService.log({ tenantId: req.tenantId, userId: req.user!.userId, action: 'REVOKE_QR', entityType: 'qr_code', entityId: qrId });
      res.json({ success: true, data: qr });
    } catch (error) { next(error); }
  }

  async getScanHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const scans = await qrService.getScanHistory(req.params.id as string);
      res.json({ success: true, data: scans });
    } catch (error) { next(error); }
  }
}

export const qrController = new QrController();

