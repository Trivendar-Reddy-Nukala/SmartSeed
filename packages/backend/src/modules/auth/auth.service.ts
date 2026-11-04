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

    // Check slug uniqueness
    const existingTenant = await db('tenants').where({ slug: input.slug }).first();
    if (existingTenant) {
      throw new AppError('Organization slug is already taken', 409, 'SLUG_TAKEN');
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
        slug: input.slug,
        status: 'pending', // Requires platform admin approval
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

