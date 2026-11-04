// ============================================================
// Tenants Validation
// ============================================================
import { z } from 'zod';

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  subscriptionPlan: z.enum(['starter', 'professional', 'enterprise']).optional(),
});

export const updateTenantStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended', 'cancelled']),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

