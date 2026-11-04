// ============================================================
// Express Request Type Extensions
// Adds user and tenant context to Express Request
// ============================================================

import { UserRole } from '@smartseed/shared';

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user context attached by auth middleware */
      user?: {
        userId: string;
        tenantId: string | null;
        role: UserRole;
        email: string;
      };
      /** Tenant context attached by tenant middleware */
      tenantId?: string;
    }
  }
}

export {};
