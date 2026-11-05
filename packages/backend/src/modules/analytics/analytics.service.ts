// ============================================================
// Analytics Service — Real data aggregation
// ============================================================

import { getDb } from '../../database/connection';

export class AnalyticsService {
  async getOverview(tenantId?: string, userId?: string, userRole?: string) {
    const db = getDb();

    let productsQuery = db('products');
    let batchesQuery = db('seed_batches');
    let transfersQuery = db('transfers');
    let usersQuery = db('users');
    let alertsQuery = db('alerts').whereNull('resolved_at');

    if (tenantId) {
      productsQuery = productsQuery.where({ tenant_id: tenantId });
      batchesQuery = batchesQuery.where({ tenant_id: tenantId });
      transfersQuery = transfersQuery.where({ tenant_id: tenantId });
      usersQuery = usersQuery.where({ tenant_id: tenantId });
      alertsQuery = alertsQuery.where({ tenant_id: tenantId });
    }

    // Role-specific stock counts from inventory
    let myUnitsInStock = 0;
    if (userId) {
      const myInvResult = await db('inventory').where({ holder_id: userId }).sum('quantity as total').first();
      myUnitsInStock = parseInt(myInvResult?.total as string || '0', 10);
    }

    // Retailer sales stats
    let totalSalesCount = 0;
    let totalSalesUnits = 0;
    let totalSalesRevenue = 0;

    let salesQuery = db('retail_sales');
    if (tenantId) salesQuery = salesQuery.where({ tenant_id: tenantId });
    if (userRole === 'retailer' && userId) salesQuery = salesQuery.where({ retailer_id: userId });

    const [salesSummary] = await salesQuery
      .select(
        db.raw('COUNT(id) as count'),
        db.raw('COALESCE(SUM(quantity), 0) as total_units'),
        db.raw('COALESCE(SUM(total_price), 0) as total_revenue')
      );

    if (salesSummary) {
      totalSalesCount = parseInt((salesSummary as any).count as string || '0', 10);
      totalSalesUnits = parseInt((salesSummary as any).total_units as string || '0', 10);
      totalSalesRevenue = parseFloat((salesSummary as any).total_revenue as string || '0');
    }

    // Incoming & Outgoing transfers for distributor/retailer
    let myIncomingTransfers = 0;
    let myOutgoingTransfers = 0;
    if (userId) {
      const [inRes] = await db('transfers').where({ receiver_id: userId }).count('id as count');
      const [outRes] = await db('transfers').where({ sender_id: userId }).count('id as count');
      myIncomingTransfers = parseInt(inRes?.count as string || '0', 10);
      myOutgoingTransfers = parseInt(outRes?.count as string || '0', 10);
    }

    const [products] = await productsQuery.count('id as count');
    const [batches] = await batchesQuery.count('id as count');
    const [transfers] = await transfersQuery.count('id as count');
    const [users] = await usersQuery.count('id as count');
    const [tenants] = tenantId ? [{ count: 1 }] : await db('tenants').count('id as count');
    const [activeAlerts] = await alertsQuery.count('id as count');

    let recentBatchesQuery = db('seed_batches')
      .leftJoin('products', 'seed_batches.product_id', 'products.id')
      .select('seed_batches.id', 'seed_batches.batch_number', 'seed_batches.status', 'seed_batches.created_at', 'products.name as product_name')
      .orderBy('seed_batches.created_at', 'desc')
      .limit(5);

    if (tenantId) {
      recentBatchesQuery = recentBatchesQuery.where({ 'seed_batches.tenant_id': tenantId });
    }
    const recentBatches = await recentBatchesQuery;

    let recentTransfersQuery = db('transfers')
      .leftJoin('seed_batches', 'transfers.batch_id', 'seed_batches.id')
      .select('transfers.id', 'transfers.quantity', 'transfers.status', 'transfers.created_at', 'seed_batches.batch_number')
      .orderBy('transfers.created_at', 'desc')
      .limit(5);

    if (userRole === 'retailer' || userRole === 'distributor') {
      if (userId) {
        recentTransfersQuery = recentTransfersQuery.where((qb) => {
          qb.where('transfers.receiver_id', userId).orWhere('transfers.sender_id', userId);
        });
      }
    } else if (tenantId) {
      recentTransfersQuery = recentTransfersQuery.where({ 'transfers.tenant_id': tenantId });
    }
    const recentTransfers = await recentTransfersQuery;

    return {
      stats: {
        products: parseInt(products?.count as string || '0', 10),
        batches: parseInt(batches?.count as string || '0', 10),
        transfers: parseInt(transfers?.count as string || '0', 10),
        users: parseInt(users?.count as string || '0', 10),
        tenants: parseInt((tenants as any)?.count as string || '0', 10),
        activeAlerts: parseInt(activeAlerts?.count as string || '0', 10),
        myUnitsInStock,
        totalSalesCount,
        totalSalesUnits,
        totalSalesRevenue,
        myIncomingTransfers,
        myOutgoingTransfers,
      },
      recentBatches,
      recentTransfers,
    };
  }

  async getSupplyChainMetrics(tenantId?: string) {
    const db = getDb();

    let eventsQuery = db('supply_chain_events').select('event_type').count('id as count').groupBy('event_type');
    let batchesQuery = db('seed_batches').select('status').count('id as count').groupBy('status');
    let transfersQuery = db('transfers').select('status').count('id as count').groupBy('status');
    let monthlyQuery = db('seed_batches')
      .where('created_at', '>', db.raw("NOW() - INTERVAL '12 months'"))
      .select(db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"))
      .count('id as count')
      .groupBy(db.raw("TO_CHAR(created_at, 'YYYY-MM')"))
      .orderBy('month', 'asc');
    let dailyScansQuery = db('qr_scans')
      .join('qr_codes', 'qr_scans.qr_code_id', 'qr_codes.id')
      .where('qr_scans.scanned_at', '>', db.raw("NOW() - INTERVAL '30 days'"))
      .select(db.raw("DATE(qr_scans.scanned_at) as date"))
      .count('qr_scans.id as count')
      .groupBy(db.raw('DATE(qr_scans.scanned_at)'))
      .orderBy('date', 'asc');

    if (tenantId) {
      eventsQuery = eventsQuery.where({ tenant_id: tenantId });
      batchesQuery = batchesQuery.where({ tenant_id: tenantId });
      transfersQuery = transfersQuery.where({ tenant_id: tenantId });
      monthlyQuery = monthlyQuery.where({ tenant_id: tenantId });
      dailyScansQuery = dailyScansQuery.where('qr_codes.tenant_id', tenantId);
    }

    const [eventsByType, batchesByStatus, transfersByStatus, monthlyBatches, dailyScans] = await Promise.all([
      eventsQuery,
      batchesQuery,
      transfersQuery,
      monthlyQuery,
      dailyScansQuery,
    ]);

    return { eventsByType, batchesByStatus, transfersByStatus, monthlyBatches, dailyScans };
  }

  async getRiskMetrics(tenantId?: string) {
    const db = getDb();

    let riskQuery = db('risk_scores').select('risk_level').count('id as count').groupBy('risk_level');
    let alertsTypeQuery = db('alerts').select('alert_type').count('id as count').groupBy('alert_type');
    let alertsSevQuery = db('alerts').select('severity').count('id as count').groupBy('severity');

    if (tenantId) {
      riskQuery = riskQuery.where({ tenant_id: tenantId });
      alertsTypeQuery = alertsTypeQuery.where({ tenant_id: tenantId });
      alertsSevQuery = alertsSevQuery.where({ tenant_id: tenantId });
    }

    const [riskDistribution, alertsByType, alertsBySeverity] = await Promise.all([
      riskQuery,
      alertsTypeQuery,
      alertsSevQuery,
    ]);

    return { riskDistribution, alertsByType, alertsBySeverity };
  }
}

export const analyticsService = new AnalyticsService();

