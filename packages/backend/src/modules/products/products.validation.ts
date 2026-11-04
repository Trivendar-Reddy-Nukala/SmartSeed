// ============================================================
// Products Validation
// ============================================================
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2).max(255),
  brandName: z.string().min(1).max(255),
  cropType: z.string().min(1).max(100),
  seedVariety: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  packagingInfo: z.string().optional(),
  regulatoryIds: z.record(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;

