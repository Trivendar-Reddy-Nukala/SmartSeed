// ============================================================
// Risk Validation
// ============================================================
import { z } from 'zod';

export const assessRiskSchema = z.object({
  batchId: z.string().uuid(),
});

