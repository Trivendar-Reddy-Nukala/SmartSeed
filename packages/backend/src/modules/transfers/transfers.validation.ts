// ============================================================
// Transfers Validation
// ============================================================
import { z } from 'zod';

export const createTransferSchema = z.object({
  batchId: z.string().uuid(),
  receiverId: z.string().uuid(),
  quantity: z.number().int().positive(),
  sourceLocation: z.string().max(255).optional(),
  destinationLocation: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

