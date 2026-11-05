// ============================================================
// Users Controller
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export class UsersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', pageSize = '20', search, role } = req.query;
      const result = await usersService.list(req.tenantId, Number(page), Number(pageSize), search as string, role as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getById(req.params.id as string, req.tenantId);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.create(req.tenantId!, req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.update(req.params.id as string, req.tenantId, req.body);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.updateStatus(req.params.id as string, req.tenantId, req.body.isActive);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  }
}

export const usersController = new UsersController();

