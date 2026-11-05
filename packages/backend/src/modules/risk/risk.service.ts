// ============================================================
// Risk Service — Counterfeit risk scoring and dashboard
// ============================================================

import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../config/logger';
import axios from 'axios';
import { config } from '../../config';

export class RiskService {
  /**
   * Get risk dashboard overview stats
   */
  async getDashboard(tenantId: string) {
    const db = getDb();
    const base = db.raw('?', [tenantId]);

    const [totalBatches] = await db('seed_batches').where({ tenant_id: tenantId }).count('id as count');
    const [totalScans] = await db('qr_scans')
      .join('qr_codes', 'qr_scans.qr_code_id', 'qr_codes.id')
      .where('qr_codes.tenant_id', tenantId)
      .count('qr_scans.id as count');
    const [suspiciousScans] = await db('qr_scans')
      .join('qr_codes', 'qr_scans.qr_code_id', 'qr_codes.id')
      .where('qr_codes.tenant_id', tenantId)
      .where('qr_scans.scan_result', 'suspicious')
      .count('qr_scans.id as count');
    const [highRiskBatches] = await db('risk_scores')
      .where({ tenant_id: tenantId })
      .whereIn('risk_level', ['high', 'critical'])
      .countDistinct('batch_id as count');
    const [criticalAlerts] = await db('alerts')
      .where({ tenant_id: tenantId, severity: 'critical' })
      .whereNull('resolved_at')
      .count('id as count');
    const [totalInvestigations] = await db('investigations')
      .where({ tenant_id: tenantId })
      .count('id as count');
    const [resolvedInvestigations] = await db('investigations')
      .where({ tenant_id: tenantId, status: 'resolved' })
      .count('id as count');
    const [pendingInvestigations] = await db('investigations')
      .where({ tenant_id: tenantId })
      .whereNotIn('status', ['resolved', 'false_positive'])
      .count('id as count');

    // Risk distribution
    const riskDistribution = await db('risk_scores')
      .where({ tenant_id: tenantId })
      .select('risk_level')
      .count('id as count')
      .groupBy('risk_level');

    // Daily anomaly trend (last 30 days)
    const anomalyTrend = await db('anomaly_predictions')
      .where({ tenant_id: tenantId })
      .where('created_at', '>', db.raw("NOW() - INTERVAL '30 days'"))
      .select(db.raw("DATE(created_at) as date"))
      .count('id as count')
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');

    // Recent high-risk alerts
    const recentAlerts = await db('alerts')
      .where({ tenant_id: tenantId })
      .whereIn('severity', ['high', 'critical'])
      .orderBy('created_at', 'desc')
      .limit(10);

    return {
      overview: {
        totalBatches: parseInt(totalBatches.count as string, 10),
        totalScans: parseInt(totalScans.count as string, 10),
        suspiciousScans: parseInt(suspiciousScans.count as string, 10),
        highRiskBatches: parseInt(highRiskBatches.count as string, 10),
        criticalAlerts: parseInt(criticalAlerts.count as string, 10),
        totalInvestigations: parseInt(totalInvestigations.count as string, 10),
        resolvedInvestigations: parseInt(resolvedInvestigations.count as string, 10),
        pendingInvestigations: parseInt(pendingInvestigations.count as string, 10),
      },
      riskDistribution,
      anomalyTrend,
      recentAlerts,
    };
  }

  /**
   * Get batches with risk scores
   */
  async getBatchesWithRisk(tenantId: string, page = 1, pageSize = 20, riskLevel?: string) {
    const db = getDb();

    let query = db('seed_batches')
      .where({ 'seed_batches.tenant_id': tenantId })
      .leftJoin('products', 'seed_batches.product_id', 'products.id')
      .leftJoin(
        db('risk_scores')
          .distinctOn('batch_id')
          .orderBy([{ column: 'batch_id' }, { column: 'calculated_at', order: 'desc' }])
          .as('latest_risk'),
        'seed_batches.id',
        'latest_risk.batch_id',
      )
      .orderBy('latest_risk.score', 'desc');

    if (riskLevel) {
      query = query.where('latest_risk.risk_level', riskLevel);
    }

    const countResult = await query.clone().clearOrder().count('seed_batches.id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const batches = await query
      .select(
        'seed_batches.id', 'seed_batches.batch_number', 'seed_batches.status',
        'seed_batches.manufacturing_date', 'seed_batches.expiry_date',
        'products.name as product_name', 'products.crop_type',
        'latest_risk.score as risk_score', 'latest_risk.risk_level',
        'latest_risk.calculated_at as risk_calculated_at',
      )
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { data: batches, meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) } };
  }

  /**
   * Get risk details for a specific batch
   */
  async getBatchRisk(batchId: string, tenantId: string) {
    const db = getDb();

    const riskScores = await db('risk_scores')
      .where({ batch_id: batchId, tenant_id: tenantId })
      .orderBy('calculated_at', 'desc')
      .limit(20);

    const anomalies = await db('anomaly_predictions')
      .where({ batch_id: batchId, tenant_id: tenantId })
      .orderBy('created_at', 'desc')
      .limit(50);

    const alerts = await db('alerts')
      .where({ batch_id: batchId, tenant_id: tenantId })
      .orderBy('created_at', 'desc');

    return { riskHistory: riskScores, anomalies, alerts };
  }

  /**
   * Trigger a risk assessment for a batch — calls AI engine + local rules
   */
  async assessBatch(batchId: string, tenantId: string) {
    const db = getDb();

    const batch = await db('seed_batches').where({ id: batchId, tenant_id: tenantId }).first();
    if (!batch) throw new AppError('Batch not found', 404, 'NOT_FOUND');

    // Gather data
    const scanData = await db('qr_scans')
      .join('qr_codes', 'qr_scans.qr_code_id', 'qr_codes.id')
      .where('qr_codes.batch_id', batchId)
      .select('qr_scans.*')
      .orderBy('qr_scans.scanned_at', 'desc')
      .limit(500);

    const transferData = await db('transfers')
      .where({ batch_id: batchId, tenant_id: tenantId })
      .orderBy('created_at', 'desc');

    const inventoryData = await db('inventory')
      .where({ batch_id: batchId, tenant_id: tenantId });

    const totalTransferred = transferData
      .filter((t: any) => t.status === 'received')
      .reduce((sum: number, t: any) => sum + t.quantity, 0);

    // Local rule-based risk calculation
    let riskScore = 0;
    const indicators: any[] = [];

    // Rule 1: Expired product
    if (new Date(batch.expiry_date) < new Date()) {
      riskScore += 15;
      indicators.push({ category: 'expiry', signal: 'expired_product', weight: 0.15, normalizedScore: 1.0, description: 'Product has expired' });
    }

    // Rule 2: Quantity mismatch
    if (totalTransferred > batch.initial_quantity) {
      const ratio = totalTransferred / batch.initial_quantity;
      const mismatchScore = Math.min(1.0, (ratio - 1) * 5);
      riskScore += Math.round(mismatchScore * 20);
      indicators.push({ category: 'inventory', signal: 'quantity_mismatch', weight: 0.20, normalizedScore: mismatchScore, description: `Total transferred (${totalTransferred}) exceeds initial quantity (${batch.initial_quantity})` });
    }

    // Rule 3: Suspicious scan count
    const recentScanCount = scanData.filter((s: any) => {
      const age = Date.now() - new Date(s.scanned_at).getTime();
      return age < 60 * 60 * 1000; // last hour
    }).length;
    if (recentScanCount > 50) {
      const scanScore = Math.min(1.0, recentScanCount / 100);
      riskScore += Math.round(scanScore * 15);
      indicators.push({ category: 'scan', signal: 'high_scan_frequency', weight: 0.15, normalizedScore: scanScore, description: `${recentScanCount} scans in the last hour` });
    }

    // Rule 4: Suspicious scan results
    const suspiciousScans = scanData.filter((s: any) => s.scan_result === 'suspicious').length;
    if (suspiciousScans > 0) {
      const susScore = Math.min(1.0, suspiciousScans / 10);
      riskScore += Math.round(susScore * 20);
      indicators.push({ category: 'scan', signal: 'suspicious_scans', weight: 0.20, normalizedScore: susScore, description: `${suspiciousScans} suspicious scans detected` });
    }

    // Rule 5: Rejected transfers
    const rejectedTransfers = transferData.filter((t: any) => t.status === 'rejected').length;
    if (rejectedTransfers > 0) {
      const rejScore = Math.min(1.0, rejectedTransfers / 5);
      riskScore += Math.round(rejScore * 10);
      indicators.push({ category: 'transfer', signal: 'rejected_transfers', weight: 0.10, normalizedScore: rejScore, description: `${rejectedTransfers} transfers were rejected` });
    }

    // Cap score at 100
    riskScore = Math.min(100, riskScore);

    // Determine risk level
    let riskLevel: string;
    if (riskScore < 25) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    // Try AI engine for additional analysis
    try {
      const aiResponse = await axios.post(`${config.ai.engineUrl}/api/v1/calculate-risk-score`, {
        batch_id: batchId,
        tenant_id: tenantId,
        anomalies: indicators,
        scan_stats: { total: scanData.length, suspicious: suspiciousScans, recentHour: recentScanCount },
        transfer_stats: { total: transferData.length, rejected: rejectedTransfers, totalTransferred },
        inventory_stats: { initialQuantity: batch.initial_quantity, currentQuantity: batch.current_quantity, totalTransferred },
      }, {
        headers: { 'X-API-Key': config.ai.apiKey },
        timeout: 10000,
      });

      if (aiResponse.data?.score !== undefined) {
        // Blend AI score with local score (60% local, 40% AI)
        riskScore = Math.round(riskScore * 0.6 + aiResponse.data.score * 0.4);
        riskScore = Math.min(100, riskScore);
        if (riskScore < 25) riskLevel = 'low';
        else if (riskScore < 50) riskLevel = 'medium';
        else if (riskScore < 75) riskLevel = 'high';
        else riskLevel = 'critical';
      }
    } catch (err) {
      logger.warn('AI engine unavailable, using local risk assessment only', { error: (err as Error).message });
    }

    // Store risk score
    const [stored] = await db('risk_scores').insert({
      tenant_id: tenantId,
      batch_id: batchId,
      score: riskScore,
      risk_level: riskLevel,
      indicators: JSON.stringify(indicators),
      model_version: '1.0.0-rules',
    }).returning('*');

    // Create alert if high/critical
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await db('alerts').insert({
        tenant_id: tenantId,
        batch_id: batchId,
        alert_type: 'high_risk_batch',
        severity: riskLevel === 'critical' ? 'critical' : 'high',
        risk_score: riskScore,
        title: `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} risk detected for batch ${batch.batch_number}`,
        description: indicators.map((i: any) => i.description).join('; '),
      });
    }

    return stored;
  }
}

export const riskService = new RiskService();

