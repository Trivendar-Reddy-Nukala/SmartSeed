// ============================================================
// Tenant Context Middleware
// Extracts and validates tenant context for multi-tenant isolation
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@smartseed/shared';
import { getDb } from '../database/connection';

/**
 * Set tenant context from authenticated user.
 * Platform admins can override via X-Tenant-Id header.
 * All other users are restricted to their own tenant.
 */
export function tenantContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // Platform admin can access any tenant
  if (req.user.role === UserRole.PLATFORM_ADMIN) {
    const headerTenantId = req.headers['x-tenant-id'] as string;
    req.tenantId = headerTenantId || undefined;
    next();
    return;
  }

  // All other users must belong to a tenant
  if (!req.user.tenantId) {
    res.status(403).json({
      success: false,
      error: { code: 'NO_TENANT', message: 'User is not associated with any organization' },
    });
    return;
  }

  req.tenantId = req.user.tenantId;
  next();
}

/**
 * Require a specific tenant context to be set.
 * Use after tenantContext middleware for routes that always need tenant scope.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    res.status(400).json({
      success: false,
      error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required. Platform admins must provide X-Tenant-Id header.' },
    });
    return;
  }
  next();
}

