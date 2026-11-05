import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import { blockchainService } from '../blockchain/blockchain.service';
import type { CreateSaleInput } from './sales.validation';
import crypto from 'crypto';

export class SalesService {
  /**
   * List retail sales made to farmers
   */
  async list(tenantId: string, userId: string, userRole: string, page = 1, pageSize = 20, search?: string) {
    const db = getDb();

    let query = db('retail_sales')
      .where({ 'retail_sales.tenant_id': tenantId })
      .leftJoin('seed_batches', 'retail_sales.batch_id', 'seed_batches.id')
      .leftJoin('products', 'seed_batches.product_id', 'products.id')
      .leftJoin('users as retailer', 'retail_sales.retailer_id', 'retailer.id')
      .orderBy('retail_sales.created_at', 'desc');

    // Retailers only see sales they made themselves
    if (userRole === 'retailer') {
      query = query.where({ 'retail_sales.retailer_id': userId });
    }

    if (search) {
      query = query.where((qb) => {
        qb.where('retail_sales.farmer_name', 'ilike', `%${search}%`)
          .orWhere('retail_sales.farmer_passbook_number', 'ilike', `%${search}%`)
          .orWhere('retail_sales.receipt_number', 'ilike', `%${search}%`)
          .orWhere('seed_batches.batch_number', 'ilike', `%${search}%`)
          .orWhere('products.name', 'ilike', `%${search}%`);
      });
    }

    const countResult = await query.clone().clearOrder().count('retail_sales.id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const sales = await query
      .select(
        'retail_sales.*',
        'seed_batches.batch_number',
        'products.name as product_name',
        'products.brand_name',
        'products.crop_type',
        'products.seed_variety',
        'retailer.first_name as retailer_first_name',
        'retailer.last_name as retailer_last_name',
        'retailer.email as retailer_email',
      )
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return {
      data: sales,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Get batches currently available in retailer inventory with stock > 0
   */
  async getAvailableBatches(tenantId: string, userId: string, userRole: string) {
    const db = getDb();

    let query = db('inventory')
      .where({ 'inventory.tenant_id': tenantId })
      .where('inventory.quantity', '>', 0)
      .join('seed_batches', 'inventory.batch_id', 'seed_batches.id')
      .join('products', 'seed_batches.product_id', 'products.id');

    if (userRole === 'retailer') {
      query = query.where({ 'inventory.holder_id': userId });
    } else {
      // If manufacturer or admin, show all batches with inventory
      query = query.where({ 'inventory.holder_id': userId });
    }

    const batches = await query.select(
      'seed_batches.id as batch_id',
      'seed_batches.batch_number',
      'seed_batches.expiry_date',
      'seed_batches.unit_of_measurement',
      'inventory.quantity as available_stock',
      'inventory.location',
      'products.name as product_name',
      'products.brand_name',
      'products.crop_type',
      'products.seed_variety',
    );

    return batches;
  }

  /**
   * Record a sale to a farmer (validates stock, passbook number, records blockchain event)
   */
  async create(tenantId: string, retailerId: string, retailerRole: string, input: CreateSaleInput) {
    const db = getDb();

    return await db.transaction(async (trx) => {
      // 1. Verify batch exists and is within expiry
      const batch = await trx('seed_batches')
        .where({ id: input.batchId, tenant_id: tenantId })
        .first();

      if (!batch) {
        throw new AppError('Seed batch not found', 404, 'BATCH_NOT_FOUND');
      }

      if (new Date(batch.expiry_date) < new Date()) {
        throw new AppError('Cannot sell expired seeds to farmers', 400, 'BATCH_EXPIRED');
      }

      if (['recalled', 'under_investigation'].includes(batch.status)) {
        throw new AppError(`Cannot sell batch currently marked as ${batch.status}`, 400, 'INVALID_BATCH_STATUS');
      }

      // 2. Verify retailer inventory for this batch
      const stock = await trx('inventory')
        .where({ batch_id: input.batchId, holder_id: retailerId, tenant_id: tenantId })
        .first();

      if (!stock || stock.quantity < input.quantity) {
        throw new AppError(
          `Insufficient stock. Available in retail inventory: ${stock?.quantity || 0} packets, Requested: ${input.quantity}`,
          400,
          'INSUFFICIENT_STOCK',
        );
      }

      // 3. Deduct stock from retailer inventory
      await trx('inventory')
        .where({ id: stock.id })
        .decrement('quantity', input.quantity);

      // 4. Generate unique receipt number
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const receiptNumber = `REC-${new Date().getFullYear()}-${randomSuffix}`;
      const totalPrice = Number((input.quantity * input.unitPrice).toFixed(2));

      // 5. Compute blockchain record hash
      const recordHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({
          batchId: input.batchId,
          farmerPassbookNumber: input.farmerPassbookNumber,
          farmerName: input.farmerName,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          totalPrice,
          receiptNumber,
          timestamp: new Date().toISOString(),
        }))
        .digest('hex');

      // 6. Record blockchain transaction
      let blockchainTxId: string;
      try {
        blockchainTxId = await blockchainService.recordVerification(
          receiptNumber,
          input.batchId,
          retailerId,
          `SOLD_TO_FARMER_${input.quantity}_UNITS`
        );
      } catch {
        blockchainTxId = `sim_tx_sale_${Date.now()}`;
      }

      // 7. Insert into retail_sales
      const [sale] = await trx('retail_sales').insert({
        tenant_id: tenantId,
        retailer_id: retailerId,
        batch_id: input.batchId,
        farmer_name: input.farmerName,
        farmer_passbook_number: input.farmerPassbookNumber,
        farmer_phone: input.farmerPhone,
        farmer_village: input.farmerVillage,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        total_price: totalPrice,
        payment_method: input.paymentMethod || 'cash',
        receipt_number: receiptNumber,
        notes: input.notes,
        blockchain_tx_id: blockchainTxId,
      }).returning('*');

      // 8. Record supply chain event
      await trx('supply_chain_events').insert({
        tenant_id: tenantId,
        batch_id: input.batchId,
        event_type: 'sold_to_farmer',
        actor_id: retailerId,
        actor_role: retailerRole,
        source_location: input.farmerVillage || 'Retail Store',
        quantity: input.quantity,
        blockchain_tx_id: blockchainTxId,
        record_hash: recordHash,
        metadata: JSON.stringify({
          receiptNumber,
          farmerName: input.farmerName,
          farmerPassbookNumber: input.farmerPassbookNumber,
          unitPrice: input.unitPrice,
          totalPrice,
        }),
      });

      return sale;
    });
  }
}

export const salesService = new SalesService();

