// ============================================================
// Users Module
// ============================================================
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'farmer', 'auditor']),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  role: z.enum(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'farmer', 'auditor']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

