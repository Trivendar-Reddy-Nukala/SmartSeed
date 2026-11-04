// ============================================================
// Analytics Service — Real data aggregation
// ============================================================

import { getDb } from '../../database/connection';

export class AnalyticsService {
  async getOverview(tenantId?: string) {
    const db = getDb();
    const where = tenantId ? { tenant_id: tenantId } : {};

    const [products] = await db('products').where(where).count('id as count');
    const [batches] = await db('seed_batches').where(where).count('id as count');
    const [transfers] = await db('transfers').where(where).count('id as count');
    const [users] = tenantId
      ? await db('users').where(where).count('id as count')
      : await db('users').count('id as count');
    const [tenants] = tenantId ? [{ count: 1 }] : await db('tenants').count('id as count');
    const [activeAlerts] = await db('alerts').where(where).whereNull('resolved_at').count('id as count');

    const recentBatches = await db('seed_batches')
      .where(where)
      .leftJoin('products', 'seed_batches.product_id', 'products.id')
      .select('seed_batches.id', 'seed_batches.batch_number', 'seed_batches.status', 'seed_batches.created_at', 'products.name as product_name')
      .orderBy('seed_batches.created_at', 'desc')
      .limit(5);

    const recentTransfers = await db('transfers')
      .where({ 'transfers.tenant_id': tenantId! })
      .leftJoin('seed_batches', 'transfers.batch_id', 'seed_batches.id')
      .select('transfers.id', 'transfers.quantity', 'transfers.status', 'transfers.created_at', 'seed_batches.batch_number')
      .orderBy('transfers.created_at', 'desc')
      .limit(5);

    return {
      stats: {
        products: parseInt(products.count as string, 10),
        batches: parseInt(batches.count as string, 10),
        transfers: parseInt(transfers.count as string, 10),
        users: parseInt(users.count as string, 10),
        tenants: parseInt((tenants as any).count as string, 10),
        activeAlerts: parseInt(activeAlerts.count as string, 10),
      },
      recentBatches,
      recentTransfers,
    };
  }

  async getSupplyChainMetrics(tenantId: string) {
    const db = getDb();

    const eventsByType = await db('supply_chain_events')
      .where({ tenant_id: tenantId })
      .select('event_type')
      .count('id as count')
      .groupBy('event_type');

    const batchesByStatus = await db('seed_batches')
      .where({ tenant_id: tenantId })
      .select('status')
      .count('id as count')
      .groupBy('status');

    const transfersByStatus = await db('transfers')
      .where({ tenant_id: tenantId })
      .select('status')
      .count('id as count')
      .groupBy('status');

    // Monthly batch creation trend (last 12 months)
    const monthlyBatches = await db('seed_batches')
      .where({ tenant_id: tenantId })
      .where('created_at', '>', db.raw("NOW() - INTERVAL '12 months'"))
      .select(db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"))
      .count('id as count')
      .groupBy(db.raw("TO_CHAR(created_at, 'YYYY-MM')"))
      .orderBy('month', 'asc');

    // Daily scans (last 30 days)
    const dailyScans = await db('qr_scans')
      .join('qr_codes', 'qr_scans.qr_code_id', 'qr_codes.id')
      .where('qr_codes.tenant_id', tenantId)
      .where('qr_scans.scanned_at', '>', db.raw("NOW() - INTERVAL '30 days'"))
      .select(db.raw("DATE(qr_scans.scanned_at) as date"))
      .count('qr_scans.id as count')
      .groupBy(db.raw('DATE(qr_scans.scanned_at)'))
      .orderBy('date', 'asc');

    return { eventsByType, batchesByStatus, transfersByStatus, monthlyBatches, dailyScans };
  }

  async getRiskMetrics(tenantId: string) {
    const db = getDb();

    const riskDistribution = await db('risk_scores')
      .where({ tenant_id: tenantId })
      .select('risk_level')
      .count('id as count')
      .groupBy('risk_level');

    const alertsByType = await db('alerts')
      .where({ tenant_id: tenantId })
      .select('alert_type')
      .count('id as count')
      .groupBy('alert_type');

    const alertsBySeverity = await db('alerts')
      .where({ tenant_id: tenantId })
      .select('severity')
      .count('id as count')
      .groupBy('severity');

    return { riskDistribution, alertsByType, alertsBySeverity };
  }
}

export const analyticsService = new AnalyticsService();

