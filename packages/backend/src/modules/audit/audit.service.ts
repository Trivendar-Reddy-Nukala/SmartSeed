// ============================================================
// Audit Service — Internal service for logging all actions
// ============================================================

import { getDb } from '../../database/connection';
import logger from '../../config/logger';

export class AuditService {
  async log(params: {
    tenantId?: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await getDb()('audit_logs').insert({
        tenant_id: params.tenantId || null,
        user_id: params.userId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
        new_values: params.newValues ? JSON.stringify(params.newValues) : null,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      });
    } catch (error) {
      logger.error('Failed to write audit log', { error, params });
    }
  }
}

export const auditService = new AuditService();

