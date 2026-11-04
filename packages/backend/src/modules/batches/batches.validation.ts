// ============================================================
// Batches Validation
// ============================================================
import { z } from 'zod';

export const createBatchSchema = z.object({
  productId: z.string().uuid(),
  batchNumber: z.string().min(1).max(100),
  manufacturingDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  expiryDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  productionLocation: z.string().min(1).max(255),
  manufacturingFacility: z.string().max(255).optional(),
  initialQuantity: z.number().int().positive(),
  unitOfMeasurement: z.string().max(50).default('packets'),
});

export const updateBatchSchema = z.object({
  productionLocation: z.string().max(255).optional(),
  manufacturingFacility: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateBatchStatusSchema = z.object({
  status: z.enum(['created', 'registered', 'in_inventory', 'partially_dispatched', 'fully_dispatched', 'expired', 'recalled', 'under_investigation']),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;

