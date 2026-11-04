// ============================================================
// Products Service
// ============================================================

import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import type { CreateProductInput } from './products.validation';

export class ProductsService {
  async list(tenantId: string, page = 1, pageSize = 20, search?: string, cropType?: string) {
    const db = getDb();
    let query = db('products').where({ tenant_id: tenantId, is_active: true }).orderBy('created_at', 'desc');

    if (search) {
      query = query.where((qb) => {
        qb.where('name', 'ilike', `%${search}%`)
          .orWhere('brand_name', 'ilike', `%${search}%`)
          .orWhere('seed_variety', 'ilike', `%${search}%`);
      });
    }
    if (cropType) query = query.where({ crop_type: cropType });

    const countResult = await query.clone().count('id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const products = await query
      .select('products.*')
      .select(db.raw('(SELECT COUNT(*) FROM seed_batches WHERE seed_batches.product_id = products.id)::int as batch_count'))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { data: products, meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) } };
  }

  async getById(id: string, tenantId: string) {
    const product = await getDb()('products').where({ id, tenant_id: tenantId }).first();
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
    return product;
  }

  async create(tenantId: string, input: CreateProductInput) {
    const [product] = await getDb()('products').insert({
      tenant_id: tenantId,
      name: input.name,
      brand_name: input.brandName,
      crop_type: input.cropType,
      seed_variety: input.seedVariety,
      description: input.description,
      category: input.category,
      packaging_info: input.packagingInfo,
      regulatory_ids: input.regulatoryIds ? JSON.stringify(input.regulatoryIds) : '{}',
      certifications: input.certifications || [],
    }).returning('*');
    return product;
  }

  async update(id: string, tenantId: string, input: Partial<CreateProductInput>) {
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (input.name) updateData.name = input.name;
    if (input.brandName) updateData.brand_name = input.brandName;
    if (input.cropType) updateData.crop_type = input.cropType;
    if (input.seedVariety) updateData.seed_variety = input.seedVariety;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.packagingInfo !== undefined) updateData.packaging_info = input.packagingInfo;
    if (input.regulatoryIds) updateData.regulatory_ids = JSON.stringify(input.regulatoryIds);
    if (input.certifications) updateData.certifications = input.certifications;

    const [updated] = await getDb()('products').where({ id, tenant_id: tenantId }).update(updateData).returning('*');
    if (!updated) throw new AppError('Product not found', 404, 'NOT_FOUND');
    return updated;
  }

  async delete(id: string, tenantId: string) {
    const batchCount = await getDb()('seed_batches').where({ product_id: id, tenant_id: tenantId }).count('id as count').first();
    if (parseInt(batchCount?.count as string || '0', 10) > 0) {
      throw new AppError('Cannot delete product with existing batches', 409, 'HAS_BATCHES');
    }
    await getDb()('products').where({ id, tenant_id: tenantId }).update({ is_active: false, updated_at: new Date() });
  }
}

export const productsService = new ProductsService();

