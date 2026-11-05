// ============================================================
// Auth Service
// Handles authentication, token management, tenant registration
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../config/logger';
import type { TokenPayload } from '@smartseed/shared';
import type { LoginInput, RegisterTenantInput } from './auth.validation';

export class AuthService {
  /**
   * Authenticate user and return tokens
   */
  async login(input: LoginInput) {
    const db = getDb();
    const user = await db('users').where({ email: input.email }).first();

    if (!user || !user.is_active) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const passwordValid = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await db('users').where({ id: user.id }).update({ last_login_at: new Date() });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        mfaEnabled: user.mfa_enabled,
      },
    };
  }

  /**
   * Register a new tenant with admin user
   */
  async register(input: RegisterTenantInput) {
    const db = getDb();

    // Auto-generate slug from company name if not provided
    let baseSlug = (input.slug || input.companyName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!baseSlug) baseSlug = 'org';

    let finalSlug = baseSlug;
    let counter = 1;
    while (await db('tenants').where({ slug: finalSlug }).first()) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    // Check email uniqueness
    const existingUser = await db('users').where({ email: input.adminEmail }).first();
    if (existingUser) {
      throw new AppError('Email is already registered', 409, 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, 12);

    // Create tenant and admin user in a transaction
    const result = await db.transaction(async (trx) => {
      const [tenant] = await trx('tenants').insert({
        name: input.companyName,
        slug: finalSlug,
        status: 'active',
        subscription_plan: input.subscriptionPlan,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        address: input.address,
      }).returning('*');

      const [user] = await trx('users').insert({
        tenant_id: tenant.id,
        email: input.adminEmail,
        password_hash: passwordHash,
        first_name: input.adminFirstName,
        last_name: input.adminLastName,
        role: 'manufacturer', // Default role for tenant admin
        is_active: true,
        email_verified: false,
      }).returning('*');

      // Create default subscription
      await trx('subscriptions').insert({
        tenant_id: tenant.id,
        plan: input.subscriptionPlan,
        status: 'active',
        max_users: input.subscriptionPlan === 'enterprise' ? 200 : input.subscriptionPlan === 'professional' ? 50 : 10,
        max_batches_per_month: input.subscriptionPlan === 'enterprise' ? 5000 : input.subscriptionPlan === 'professional' ? 500 : 100,
        max_qr_codes: input.subscriptionPlan === 'enterprise' ? 500000 : input.subscriptionPlan === 'professional' ? 50000 : 10000,
      });

      // Auto-provision starter catalog and inventory for immediate platform usability
      const [starterProduct] = await trx('products').insert({
        tenant_id: tenant.id,
        name: 'Certified Samba Mahsuri Paddy',
        brand_name: `${input.companyName} Seeds`,
        crop_type: 'Paddy / Rice',
        seed_variety: 'BPT-5204',
        category: 'certified',
        description: 'High-yielding medium slender grain paddy seeds with superior cooking quality.',
        packaging_info: JSON.stringify({ bag_size: '25kg', material: 'HDPE woven bag' }),
        certifications: ['ISTA Certified', 'State Seed Agency Approved'],
      }).returning('*');

      await trx('products').insert({
        tenant_id: tenant.id,
        name: 'Super Bt-II Cotton Hybrid',
        brand_name: `${input.companyName} Hybrid`,
        crop_type: 'Cotton',
        seed_variety: 'RCH-659 BG-II',
        category: 'hybrid',
        description: 'Bollworm-resistant premium hybrid cotton seeds for semi-arid zones.',
        packaging_info: JSON.stringify({ bag_size: '450g', material: 'Foil laminate pouch' }),
        certifications: ['GEAC Approved', 'ICAR Certified'],
      });

      const mfgDate = new Date();
      mfgDate.setMonth(mfgDate.getMonth() - 1);
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 2);

      const batchNum = `${finalSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'SEED'}-BPT5204-${new Date().getFullYear()}-001`;

      const [starterBatch] = await trx('seed_batches').insert({
        tenant_id: tenant.id,
        product_id: starterProduct.id,
        batch_number: batchNum,
        manufacturing_date: mfgDate,
        expiry_date: expDate,
        production_location: input.address || 'Central Processing Facility',
        manufacturing_facility: `${input.companyName} Plant 1`,
        initial_quantity: 5000,
        current_quantity: 5000,
        unit_of_measurement: 'packets',
        status: 'in_inventory',
      }).returning('*');

      await trx('inventory').insert({
        tenant_id: tenant.id,
        batch_id: starterBatch.id,
        holder_id: user.id,
        holder_role: 'manufacturer',
        quantity: 5000,
        location: input.address || 'Central Processing Facility',
      });

      await trx('supply_chain_events').insert({
        tenant_id: tenant.id,
        batch_id: starterBatch.id,
        event_type: 'manufactured',
        actor_id: user.id,
        actor_role: 'manufacturer',
        source_location: input.address || 'Central Processing Facility',
        quantity: 5000,
      });

      // Pre-seed partner accounts for instant multi-tier testing
      const partnerPassword = await bcrypt.hash('SmartSeed@Demo2026', 12);
      await trx('users').insert({
        tenant_id: tenant.id,
        email: `distributor@${finalSlug}.example`,
        password_hash: partnerPassword,
        first_name: 'Regional',
        last_name: 'Distributor',
        role: 'distributor',
        phone: '+91-9800000001',
        is_active: true,
      });

      await trx('users').insert({
        tenant_id: tenant.id,
        email: `retailer@${finalSlug}.example`,
        password_hash: partnerPassword,
        first_name: 'Local',
        last_name: 'Retailer',
        role: 'retailer',
        phone: '+91-9800000002',
        is_active: true,
      });

      return { tenant, user };
    });

    logger.info('Tenant registered', { tenantId: result.tenant.id, slug: input.slug });

    const accessToken = this.generateAccessToken(result.user);
    const refreshToken = await this.generateRefreshToken(result.user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        tenantId: result.user.tenant_id,
        email: result.user.email,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        role: result.user.role,
        isActive: result.user.is_active,
        emailVerified: result.user.email_verified,
        mfaEnabled: result.user.mfa_enabled,
      },
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(token: string) {
    const db = getDb();
    const tokenHash = this.hashToken(token);

    const storedToken = await db('refresh_tokens')
      .where({ token_hash: tokenHash, revoked: false })
      .where('expires_at', '>', new Date())
      .first();

    if (!storedToken) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await db('users').where({ id: storedToken.user_id, is_active: true }).first();
    if (!user) {
      throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');
    }

    // Revoke old token (rotation)
    await db('refresh_tokens').where({ id: storedToken.id }).update({ revoked: true });

    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revoke a refresh token (logout)
   */
  async logout(token: string) {
    const db = getDb();
    const tokenHash = this.hashToken(token);
    await db('refresh_tokens').where({ token_hash: tokenHash }).update({ revoked: true });
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const db = getDb();
    const user = await db('users')
      .leftJoin('tenants', 'users.tenant_id', 'tenants.id')
      .where('users.id', userId)
      .select(
        'users.id', 'users.tenant_id', 'users.email', 'users.first_name',
        'users.last_name', 'users.role', 'users.is_active', 'users.email_verified',
        'users.mfa_enabled', 'users.phone', 'users.avatar_url', 'users.last_login_at',
        'users.created_at',
        'tenants.name as tenant_name', 'tenants.slug as tenant_slug',
        'tenants.status as tenant_status',
      )
      .first();

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  // ---- Private Helpers ----

  private generateAccessToken(user: any): string {
    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenant_id || null,
      role: user.role,
      email: user.email,
    };
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await getDb()('refresh_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return token;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const authService = new AuthService();

