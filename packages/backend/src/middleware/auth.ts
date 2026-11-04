// ============================================================
// Authentication Middleware
// JWT verification and role-based authorization
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole, type TokenPayload } from '@smartseed/shared';
import logger from '../config/logger';

/**
 * Authenticate requests by verifying JWT from Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch (err) {
    logger.warn('Invalid JWT token', { error: (err as Error).message });
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
}

/**
 * Authorize specific roles to access a route
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied', { userId: req.user.userId, role: req.user.role, required: allowedRoles });
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' },
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token present
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
      req.user = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
      };
    } catch {
      // Token invalid - proceed without auth
    }
  }

  next();
}

