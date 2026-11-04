// ============================================================
// QR Code Validation
// ============================================================
import { z } from 'zod';

export const generateQrSchema = z.object({
  batchId: z.string().uuid(),
  count: z.number().int().min(1).max(10000).default(1),
  packagePrefix: z.string().max(50).optional(),
});

export type GenerateQrInput = z.infer<typeof generateQrSchema>;

