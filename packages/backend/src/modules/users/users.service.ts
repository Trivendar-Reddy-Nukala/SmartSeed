// ============================================================
// Users Service
// ============================================================

import bcrypt from 'bcryptjs';
import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import type { CreateUserInput, UpdateUserInput } from './users.validation';

export class UsersService {
  async list(tenantId: string | undefined, page = 1, pageSize = 20, search?: string, role?: string) {
    const db = getDb();
    let query = db('users').orderBy('created_at', 'desc');

    if (tenantId) query = query.where({ tenant_id: tenantId });
    if (role) query = query.where({ role });
    if (search) {
      query = query.where((qb) => {
        qb.where('first_name', 'ilike', `%${search}%`)
          .orWhere('last_name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`);
      });
    }

    const countResult = await query.clone().clearOrder().count('id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const users = await query
      .select('id', 'tenant_id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'email_verified', 'phone', 'last_login_at', 'created_at')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { data: users, meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) } };
  }

  async getById(id: string, tenantId?: string) {
    const db = getDb();
    let query = db('users').where({ id });
    if (tenantId) query = query.where({ tenant_id: tenantId });
    const user = await query.select('id', 'tenant_id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'email_verified', 'phone', 'avatar_url', 'last_login_at', 'created_at').first();
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
  }

  async create(tenantId: string, input: CreateUserInput) {
    const db = getDb();
    const existing = await db('users').where({ email: input.email }).first();
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const [user] = await db('users').insert({
      tenant_id: tenantId,
      email: input.email,
      password_hash: passwordHash,
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.role,
      phone: input.phone,
    }).returning(['id', 'tenant_id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at']);

    return user;
  }

  async update(id: string, tenantId: string | undefined, input: UpdateUserInput) {
    const db = getDb();
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (input.firstName) updateData.first_name = input.firstName;
    if (input.lastName) updateData.last_name = input.lastName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.role) updateData.role = input.role;

    let query = db('users').where({ id });
    if (tenantId) query = query.where({ tenant_id: tenantId });

    const [updated] = await query.update(updateData).returning('*');
    if (!updated) throw new AppError('User not found', 404, 'NOT_FOUND');
    return updated;
  }

  async updateStatus(id: string, tenantId: string | undefined, isActive: boolean) {
    const db = getDb();
    let query = db('users').where({ id });
    if (tenantId) query = query.where({ tenant_id: tenantId });
    const [updated] = await query.update({ is_active: isActive, updated_at: new Date() }).returning('*');
    if (!updated) throw new AppError('User not found', 404, 'NOT_FOUND');
    return updated;
  }
}

export const usersService = new UsersService();

