// ============================================================
// Investigations Service
// ============================================================

import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import axios from 'axios';
import { config } from '../../config';
import logger from '../../config/logger';

export class InvestigationsService {
  async list(tenantId?: string, page = 1, pageSize = 20, status?: string) {
    const db = getDb();
    let query = db('investigations')
      .leftJoin('seed_batches', 'investigations.batch_id', 'seed_batches.id')
      .leftJoin('users as assignee', 'investigations.assigned_to', 'assignee.id')
      .orderBy('investigations.created_at', 'desc');

    if (tenantId) {
      query = query.where({ 'investigations.tenant_id': tenantId });
    }

    if (status) query = query.where('investigations.status', status);

    const countResult = await query.clone().clearOrder().count('investigations.id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const investigations = await query
      .select(
        'investigations.*',
        'seed_batches.batch_number',
        'assignee.first_name as assignee_first_name',
        'assignee.last_name as assignee_last_name',
      )
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { data: investigations, meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) } };
  }

  async getById(id: string, tenantId?: string) {
    const db = getDb();
    let query = db('investigations')
      .where({ 'investigations.id': id })
      .leftJoin('seed_batches', 'investigations.batch_id', 'seed_batches.id')
      .leftJoin('products', 'seed_batches.product_id', 'products.id')
      .leftJoin('users as assignee', 'investigations.assigned_to', 'assignee.id');

    if (tenantId) {
      query = query.where({ 'investigations.tenant_id': tenantId });
    }

    const investigation = await query
      .select(
        'investigations.*',
        'seed_batches.batch_number', 'seed_batches.status as batch_status',
        'products.name as product_name',
        'assignee.first_name as assignee_first_name', 'assignee.last_name as assignee_last_name',
      )
      .first();
    if (!investigation) throw new AppError('Investigation not found', 404, 'NOT_FOUND');
    return investigation;
  }

  async create(tenantId: string, input: { batchId: string; alertId?: string; mainSuspiciousActivity: string }) {
    const db = getDb();

    const batch = await db('seed_batches').where({ id: input.batchId, tenant_id: tenantId }).first();
    if (!batch) throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');

    // Get latest risk score
    const riskScore = await db('risk_scores')
      .where({ batch_id: input.batchId, tenant_id: tenantId })
      .orderBy('calculated_at', 'desc')
      .first();

    const [investigation] = await db('investigations').insert({
      tenant_id: tenantId,
      batch_id: input.batchId,
      alert_id: input.alertId,
      status: 'opened',
      risk_score: riskScore?.score || 0,
      risk_category: riskScore?.risk_level || 'low',
      main_suspicious_activity: input.mainSuspiciousActivity,
    }).returning('*');

    // Update batch status
    await db('seed_batches').where({ id: input.batchId }).update({ status: 'under_investigation', updated_at: new Date() });

    // Create supply chain event
    await db('supply_chain_events').insert({
      tenant_id: tenantId,
      batch_id: input.batchId,
      event_type: 'investigation_opened',
      actor_id: (await db('users').where({ role: 'platform_admin' }).first())?.id || input.batchId, // fallback
      actor_role: 'platform_admin',
      metadata: JSON.stringify({ investigationId: investigation.id }),
    });

    // Link to alert if provided
    if (input.alertId) {
      await db('alerts').where({ id: input.alertId }).update({
        investigation_id: investigation.id,
        investigation_status: 'opened',
      });
    }

    return investigation;
  }

  async updateStatus(id: string, tenantId: string, userId: string, status: string, resolution?: string) {
    const db = getDb();
    const updateData: Record<string, unknown> = { status, updated_at: new Date() };

    if (resolution) updateData.resolution = resolution;
    if (['resolved', 'false_positive'].includes(status)) {
      updateData.resolved_by = userId;
      updateData.resolved_at = new Date();
    }

    const [updated] = await db('investigations')
      .where({ id, tenant_id: tenantId })
      .update(updateData)
      .returning('*');
    if (!updated) throw new AppError('Investigation not found', 404, 'NOT_FOUND');

    // Update linked alert
    await db('alerts')
      .where({ investigation_id: id })
      .update({ investigation_status: status });

    // If resolved, update batch status back
    if (['resolved', 'false_positive'].includes(status)) {
      await db('seed_batches').where({ id: updated.batch_id }).update({ status: 'in_inventory', updated_at: new Date() });
    }

    return updated;
  }

  async assign(id: string, tenantId: string, assignedTo: string) {
    const [updated] = await getDb()('investigations')
      .where({ id, tenant_id: tenantId })
      .update({ assigned_to: assignedTo, status: 'under_investigation', updated_at: new Date() })
      .returning('*');
    if (!updated) throw new AppError('Investigation not found', 404, 'NOT_FOUND');
    return updated;
  }

  /**
   * Generate AI investigation report
   */
  async generateReport(id: string, tenantId: string) {
    const db = getDb();
    const investigation = await this.getById(id, tenantId);

    // Gather all evidence
    const scanHistory = await db('qr_scans')
      .join('qr_codes', 'qr_scans.qr_code_id', 'qr_codes.id')
      .where('qr_codes.batch_id', investigation.batch_id)
      .select('qr_scans.*')
      .orderBy('scanned_at', 'desc')
      .limit(200);

    const transferHistory = await db('transfers')
      .where({ batch_id: investigation.batch_id, tenant_id: tenantId })
      .orderBy('created_at', 'desc');

    const supplyChainEvents = await db('supply_chain_events')
      .where({ batch_id: investigation.batch_id, tenant_id: tenantId })
      .orderBy('created_at', 'asc');

    const anomalyPredictions = await db('anomaly_predictions')
      .where({ batch_id: investigation.batch_id, tenant_id: tenantId })
      .orderBy('created_at', 'desc');

    // Try AI engine
    try {
      const response = await axios.post(`${config.ai.engineUrl}/api/v1/investigate`, {
        batch_id: investigation.batch_id,
        tenant_id: tenantId,
        alert_id: investigation.alert_id,
        anomaly_predictions: anomalyPredictions,
        scan_history: scanHistory,
        transfer_history: transferHistory,
        supply_chain_events: supplyChainEvents,
      }, {
        headers: { 'X-API-Key': config.ai.apiKey },
        timeout: 30000,
      });

      if (response.data) {
        // Update investigation with AI findings
        await db('investigations').where({ id }).update({
          supporting_evidence: JSON.stringify(response.data.supporting_evidence || []),
          potential_explanation: response.data.potential_explanation,
          recommended_steps: response.data.recommended_steps || [],
          updated_at: new Date(),
        });

        return response.data;
      }
    } catch (err) {
      logger.warn('AI investigation engine unavailable', { error: (err as Error).message });
    }

    // Fallback: generate basic report from available data
    return {
      investigationId: id,
      batchId: investigation.batch_id,
      riskScore: investigation.risk_score,
      riskCategory: investigation.risk_category,
      mainSuspiciousActivity: investigation.main_suspicious_activity,
      supportingEvidence: [
        { type: 'scan_history', description: `${scanHistory.length} scans recorded`, data: { total: scanHistory.length } },
        { type: 'transfer_history', description: `${transferHistory.length} transfers recorded`, data: { total: transferHistory.length } },
      ],
      timeline: supplyChainEvents.map((e: any) => ({
        timestamp: e.created_at,
        event: e.event_type,
        details: `${e.actor_role} at ${e.source_location || e.destination_location || 'unknown'}`,
      })),
      potentialExplanation: 'AI engine unavailable. Manual review of evidence is recommended.',
      recommendedSteps: ['Review scan history for anomalies', 'Verify transfer chain integrity', 'Contact relevant stakeholders'],
      confidence: 0.3,
      limitations: ['AI investigation engine was unavailable', 'Analysis based on available data only'],
    };
  }
}

export const investigationsService = new InvestigationsService();

