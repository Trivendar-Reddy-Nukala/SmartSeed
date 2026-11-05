// ============================================================
// Tenants Service
// ============================================================

import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import type { UpdateTenantInput } from './tenants.validation';

export class TenantsService {
  async list(page = 1, pageSize = 20, search?: string) {
    const db = getDb();
    let query = db('tenants').orderBy('created_at', 'desc');

    if (search) {
      query = query.where((qb) => {
        qb.where('name', 'ilike', `%${search}%`)
          .orWhere('slug', 'ilike', `%${search}%`)
          .orWhere('contact_email', 'ilike', `%${search}%`);
      });
    }

    const countResult = await query.clone().clearOrder().count('id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const tenants = await query
      .select('tenants.*')
      .select(db.raw('(SELECT COUNT(*) FROM users WHERE users.tenant_id = tenants.id)::int as user_count'))
      .select(db.raw('(SELECT COUNT(*) FROM seed_batches WHERE seed_batches.tenant_id = tenants.id)::int as batch_count'))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return {
      data: tenants,
      meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
    };
  }

  async getById(id: string) {
    const db = getDb();
    const tenant = await db('tenants').where({ id }).first();
    if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');
    return tenant;
  }

  async update(id: string, input: UpdateTenantInput) {
    const db = getDb();
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (input.name) updateData.name = input.name;
    if (input.contactEmail) updateData.contact_email = input.contactEmail;
    if (input.contactPhone !== undefined) updateData.contact_phone = input.contactPhone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.subscriptionPlan) updateData.subscription_plan = input.subscriptionPlan;

    const [updated] = await db('tenants').where({ id }).update(updateData).returning('*');
    if (!updated) throw new AppError('Tenant not found', 404, 'NOT_FOUND');
    return updated;
  }

  async updateStatus(id: string, status: string) {
    const db = getDb();
    const [updated] = await db('tenants').where({ id }).update({ status, updated_at: new Date() }).returning('*');
    if (!updated) throw new AppError('Tenant not found', 404, 'NOT_FOUND');
    return updated;
  }

  async delete(id: string) {
    const db = getDb();
    const deleted = await db('tenants').where({ id }).del();
    if (!deleted) throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }
}

export const tenantsService = new TenantsService();

