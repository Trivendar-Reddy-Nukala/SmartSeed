// ============================================================
// Investigations Validation
// ============================================================
import { z } from 'zod';

export const createInvestigationSchema = z.object({
  batchId: z.string().uuid(),
  alertId: z.string().uuid().optional(),
  mainSuspiciousActivity: z.string().min(1),
});

export const updateInvestigationStatusSchema = z.object({
  status: z.enum(['opened', 'under_investigation', 'additional_verification', 'confirmed_suspicious', 'false_positive', 'escalated_manufacturer', 'escalated_authority', 'resolved']),
  resolution: z.string().optional(),
});

export const assignInvestigationSchema = z.object({
  assignedTo: z.string().uuid(),
});

