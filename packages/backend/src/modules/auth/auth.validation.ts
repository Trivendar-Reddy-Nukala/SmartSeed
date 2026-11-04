// ============================================================
// Auth Validation Schemas
// ============================================================

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerTenantSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  contactEmail: z.string().email('Invalid contact email'),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  adminFirstName: z.string().min(1, 'First name is required').max(100),
  adminLastName: z.string().min(1, 'Last name is required').max(100),
  adminEmail: z.string().email('Invalid admin email'),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  subscriptionPlan: z.enum(['starter', 'professional', 'enterprise']).default('starter'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

