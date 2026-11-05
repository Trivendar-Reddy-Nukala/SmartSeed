// ============================================================
// Inventory Service — Multi-Tier Supply Chain Stock Management
// ============================================================

import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';

export interface InventoryListParams {
  tenantId?: string;
  userId: string;
  userRole: string;
  page?: number;
  pageSize?: number;
  search?: string;
  batchId?: string;
  scope?: 'my' | 'network';
}

export class InventoryService {
  /**
   * List inventory items.
   * - Distributors and Retailers see their warehouse / store stock by default.
   * - Manufacturers & Admins see their stock or full network stock with scope='network'.
   */
  async list(params: InventoryListParams) {
    const db = getDb();
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;

    let query = db('inventory')
      .join('seed_batches', 'inventory.batch_id', 'seed_batches.id')
      .join('products', 'seed_batches.product_id', 'products.id')
      .join('users', 'inventory.holder_id', 'users.id')
      .orderBy('inventory.updated_at', 'desc');

    if (params.tenantId) {
      query = query.where({ 'inventory.tenant_id': params.tenantId });
    }

    // Role-based scope: non-manufacturers always see their own inventory
    const shouldScopeToUser = params.scope === 'my' || 
      (params.userRole !== 'manufacturer' && params.userRole !== 'platform_admin');

    if (shouldScopeToUser) {
      query = query.where({ 'inventory.holder_id': params.userId });
    }

    if (params.batchId) {
      query = query.where({ 'inventory.batch_id': params.batchId });
    }

    if (params.search) {
      const s = params.search;
      query = query.where((qb) => {
        qb.where('seed_batches.batch_number', 'ilike', `%${s}%`)
          .orWhere('products.name', 'ilike', `%${s}%`)
          .orWhere('products.brand_name', 'ilike', `%${s}%`)
          .orWhere('products.seed_variety', 'ilike', `%${s}%`)
          .orWhere('inventory.location', 'ilike', `%${s}%`)
          .orWhere('users.first_name', 'ilike', `%${s}%`)
          .orWhere('users.last_name', 'ilike', `%${s}%`);
      });
    }

    const countResult = await query.clone().clearOrder().count('inventory.id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const items = await query
      .select(
        'inventory.id',
        'inventory.tenant_id',
        'inventory.batch_id',
        'inventory.holder_id',
        'inventory.holder_role',
        'inventory.quantity',
        'inventory.location',
        'inventory.created_at',
        'inventory.updated_at',
        'seed_batches.batch_number',
        'seed_batches.manufacturing_date',
        'seed_batches.expiry_date',
        'seed_batches.unit_of_measurement',
        'seed_batches.initial_quantity as batch_initial_quantity',
        'seed_batches.status as batch_status',
        'products.id as product_id',
        'products.name as product_name',
        'products.brand_name',
        'products.crop_type',
        'products.seed_variety',
        'users.first_name as holder_first_name',
        'users.last_name as holder_last_name',
        'users.email as holder_email'
      )
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return {
      data: items,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Get batches available in the current user's inventory with quantity > 0
   * Used for the "Initiate Transfer" modal and POS dropdowns.
   */
  async getMyAvailableBatches(tenantId: string | undefined, userId: string) {
    const db = getDb();

    let query = db('inventory')
      .where({ 'inventory.holder_id': userId })
      .where('inventory.quantity', '>', 0)
      .join('seed_batches', 'inventory.batch_id', 'seed_batches.id')
      .join('products', 'seed_batches.product_id', 'products.id')
      .orderBy('inventory.updated_at', 'desc');

    if (tenantId) {
      query = query.where({ 'inventory.tenant_id': tenantId });
    }

    const items = await query.select(
      'seed_batches.id',
      'seed_batches.id as batch_id',
      'seed_batches.batch_number',
      'seed_batches.unit_of_measurement',
      'seed_batches.manufacturing_date',
      'seed_batches.expiry_date',
      'seed_batches.status',
      'inventory.quantity as current_quantity',
      'inventory.quantity as my_quantity',
      'inventory.quantity as available_stock',
      'inventory.location',
      'products.id as product_id',
      'products.name as product_name',
      'products.brand_name',
      'products.crop_type',
      'products.seed_variety'
    );

    return items;
  }

  /**
   * Summary KPI numbers for stock management
   */
  async getSummary(tenantId: string | undefined, userId: string, userRole: string) {
    const db = getDb();

    // User's own units in stock
    const userUnitsResult = await db('inventory')
      .where({ holder_id: userId })
      .sum('quantity as total')
      .first();
    const myUnitsInStock = parseInt(userUnitsResult?.total as string || '0', 10);

    // Network units (across tenant)
    let networkQuery = db('inventory');
    if (tenantId) networkQuery = networkQuery.where({ tenant_id: tenantId });
    const networkUnitsResult = await networkQuery.sum('quantity as total').first();
    const networkUnitsInStock = parseInt(networkUnitsResult?.total as string || '0', 10);

    // Batches count
    const myBatchesResult = await db('inventory')
      .where({ holder_id: userId })
      .where('quantity', '>', 0)
      .countDistinct('batch_id as count')
      .first();
    const myBatchesCount = parseInt(myBatchesResult?.count as string || '0', 10);

    return {
      myUnitsInStock,
      networkUnitsInStock,
      myBatchesCount,
    };
  }
}

export const inventoryService = new InventoryService();

