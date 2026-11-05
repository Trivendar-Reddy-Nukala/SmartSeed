// ============================================================
// Batches Service — Core batch management with inventory tracking
// ============================================================

import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import { blockchainService } from '../blockchain/blockchain.service';
import { auditService } from '../audit/audit.service';
import type { CreateBatchInput } from './batches.validation';

export class BatchesService {
  async list(tenantId?: string, page = 1, pageSize = 20, search?: string, status?: string, productId?: string, userId?: string) {
    const db = getDb();
    let query = db('seed_batches')
      .leftJoin('products', 'seed_batches.product_id', 'products.id')
      .orderBy('seed_batches.created_at', 'desc');

    if (tenantId) {
      query = query.where({ 'seed_batches.tenant_id': tenantId });
    }

    if (search) {
      query = query.where((qb) => {
        qb.where('seed_batches.batch_number', 'ilike', `%${search}%`)
          .orWhere('products.name', 'ilike', `%${search}%`);
      });
    }
    if (status) query = query.where('seed_batches.status', status);
    if (productId) query = query.where('seed_batches.product_id', productId);

    const countResult = await query.clone().clearOrder().count('seed_batches.id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    let selectQuery = query
      .select(
        'seed_batches.*',
        'products.name as product_name',
        'products.brand_name',
        'products.crop_type',
        'products.seed_variety',
      )
      .select(db.raw(`(SELECT json_build_object('score', rs.score, 'risk_level', rs.risk_level) FROM risk_scores rs WHERE rs.batch_id = seed_batches.id ORDER BY rs.calculated_at DESC LIMIT 1) as latest_risk`));

    if (userId) {
      selectQuery = selectQuery.select(db.raw(`COALESCE((SELECT quantity FROM inventory WHERE inventory.batch_id = seed_batches.id AND inventory.holder_id = ? LIMIT 1), 0)::int as my_quantity`, [userId]));
    }

    const batches = await selectQuery
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { data: batches, meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) } };
  }

  async getById(id: string, tenantId?: string) {
    const db = getDb();
    let query = db('seed_batches')
      .where({ 'seed_batches.id': id })
      .leftJoin('products', 'seed_batches.product_id', 'products.id');

    if (tenantId) {
      query = query.where({ 'seed_batches.tenant_id': tenantId });
    }

    const batch = await query
      .select('seed_batches.*', 'products.name as product_name', 'products.brand_name', 'products.crop_type', 'products.seed_variety', 'products.description as product_description', 'products.certifications as product_certifications')
      .first();

    if (!batch) throw new AppError('Batch not found', 404, 'NOT_FOUND');
    return batch;
  }

  async create(tenantId: string, userId: string, userRole: string, input: CreateBatchInput) {
    const db = getDb();

    // Verify product exists and belongs to tenant
    const product = await db('products').where({ id: input.productId, tenant_id: tenantId, is_active: true }).first();
    if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');

    // Check batch number uniqueness within tenant
    const existing = await db('seed_batches').where({ tenant_id: tenantId, batch_number: input.batchNumber }).first();
    if (existing) throw new AppError('Batch number already exists', 409, 'BATCH_EXISTS');

    // Validate dates
    const mfgDate = new Date(input.manufacturingDate);
    const expDate = new Date(input.expiryDate);
    if (expDate <= mfgDate) throw new AppError('Expiry date must be after manufacturing date', 400, 'INVALID_DATES');

    const result = await db.transaction(async (trx) => {
      // Create batch
      const [batch] = await trx('seed_batches').insert({
        tenant_id: tenantId,
        product_id: input.productId,
        batch_number: input.batchNumber,
        manufacturing_date: input.manufacturingDate,
        expiry_date: input.expiryDate,
        production_location: input.productionLocation,
        manufacturing_facility: input.manufacturingFacility,
        initial_quantity: input.initialQuantity,
        current_quantity: input.initialQuantity,
        unit_of_measurement: input.unitOfMeasurement,
        status: 'in_inventory',
      }).returning('*');

      // Create inventory record for manufacturer
      await trx('inventory').insert({
        tenant_id: tenantId,
        batch_id: batch.id,
        holder_id: userId,
        holder_role: userRole,
        quantity: input.initialQuantity,
        location: input.productionLocation,
      });

      // Create supply chain event
      await trx('supply_chain_events').insert({
        tenant_id: tenantId,
        batch_id: batch.id,
        event_type: 'manufactured',
        actor_id: userId,
        actor_role: userRole,
        source_location: input.productionLocation,
        quantity: input.initialQuantity,
        metadata: JSON.stringify({ facility: input.manufacturingFacility }),
      });

      // Record on blockchain (simulation mode)
      const txId = await blockchainService.registerBatch(batch.id, input.productId, tenantId, batch);

      // Store blockchain transaction
      await trx('blockchain_transactions').insert({
        tenant_id: tenantId,
        batch_id: batch.id,
        tx_id: txId,
        channel_name: 'seedchannel',
        chaincode_name: 'smartseed',
        function_name: 'RegisterBatch',
        args: JSON.stringify([batch.id, input.productId]),
        record_hash: blockchainService.computeHash(batch),
        status: 'committed',
        block_number: Math.floor(Math.random() * 10000),
        timestamp: new Date(),
      });

      return batch;
    });

    return result;
  }

  async getTimeline(batchId: string, tenantId?: string) {
    const db = getDb();
    let query = db('supply_chain_events')
      .where({ 'supply_chain_events.batch_id': batchId });

    if (tenantId) {
      query = query.where({ 'supply_chain_events.tenant_id': tenantId });
    }

    const events = await query
      .leftJoin('users', 'supply_chain_events.actor_id', 'users.id')
      .select(
        'supply_chain_events.*',
        'users.first_name as actor_first_name',
        'users.last_name as actor_last_name',
        'users.role as actor_user_role',
      )
      .orderBy('supply_chain_events.created_at', 'asc');

    return events;
  }

  async getPassport(batchId: string, tenantId?: string) {
    const db = getDb();

    const batch = await this.getById(batchId, tenantId);
    const events = await this.getTimeline(batchId, tenantId);
    const effectiveTenantId = batch.tenant_id || tenantId;
    const tenant = effectiveTenantId ? await db('tenants').where({ id: effectiveTenantId }).first() : null;

    // Get latest risk score
    let riskQuery = db('risk_scores').where({ batch_id: batchId });
    if (effectiveTenantId) riskQuery = riskQuery.where({ tenant_id: effectiveTenantId });
    const riskScore = await riskQuery.orderBy('calculated_at', 'desc').first();

    // Get blockchain transaction count
    let txQuery = db('blockchain_transactions').where({ batch_id: batchId });
    if (effectiveTenantId) txQuery = txQuery.where({ tenant_id: effectiveTenantId });
    const txCount = await txQuery.count('id as count').first();

    // Get active investigations
    let invQuery = db('investigations').where({ batch_id: batchId }).whereNotIn('status', ['resolved', 'false_positive']);
    if (effectiveTenantId) invQuery = invQuery.where({ tenant_id: effectiveTenantId });
    const activeInvestigation = await invQuery.first();

    const expiryDate = new Date(batch.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      product: {
        name: batch.product_name,
        brandName: batch.brand_name,
        cropType: batch.crop_type,
        seedVariety: batch.seed_variety,
        description: batch.product_description,
        certifications: batch.product_certifications || [],
      },
      manufacturer: {
        name: tenant?.name || 'Unknown',
        location: batch.production_location,
      },
      batch: {
        batchNumber: batch.batch_number,
        manufacturingDate: batch.manufacturing_date,
        expiryDate: batch.expiry_date,
        productionLocation: batch.production_location,
        status: batch.status,
      },
      supplyChainJourney: events.map((e: any) => ({
        eventType: e.event_type,
        actor: `${e.actor_first_name} ${e.actor_last_name}`,
        actorRole: e.actor_role || e.actor_user_role,
        location: e.source_location || e.destination_location,
        timestamp: e.created_at,
        verified: !!e.blockchain_tx_id,
      })),
      blockchainVerification: {
        verified: parseInt(txCount?.count as string || '0', 10) > 0,
        totalTransactions: parseInt(txCount?.count as string || '0', 10),
      },
      riskStatus: {
        currentScore: riskScore?.score || 0,
        riskLevel: riskScore?.risk_level || 'low',
        hasActiveInvestigation: !!activeInvestigation,
        warnings: activeInvestigation ? ['This batch is under investigation'] : [],
      },
      expiryInfo: {
        expiryDate: batch.expiry_date,
        isExpired: daysUntilExpiry <= 0,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
      },
    };
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    const [updated] = await getDb()('seed_batches')
      .where({ id, tenant_id: tenantId })
      .update({ status, updated_at: new Date() })
      .returning('*');
    if (!updated) throw new AppError('Batch not found', 404, 'NOT_FOUND');
    return updated;
  }
}

export const batchesService = new BatchesService();

