import { z } from 'zod';

export const createSaleSchema = z.object({
  batchId: z.string().uuid('Invalid batch ID'),
  farmerName: z.string().min(2, 'Farmer name must be at least 2 characters').max(255),
  farmerPassbookNumber: z.string().min(3, 'Farmer passbook number is required').max(100),
  farmerPhone: z.string().optional(),
  farmerVillage: z.string().max(255).optional(),
  quantity: z.number().int().positive('Quantity must be at least 1 packet'),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank_transfer']).default('cash'),
  notes: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

