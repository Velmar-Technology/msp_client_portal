import { z } from 'zod';

export const FeatureSchema = z.object({
  text: z.string().min(1, 'Feature text is required'),
  included: z.boolean(),
});

export const CreatePlanDTO = z.object({
  id: z.string().min(2, 'Plan ID must be at least 2 characters').max(50),
  name: z.string().min(1, 'Plan name must be at least 1 character').max(255),
  description: z.string().nullable().optional(),
  price: z.coerce.number().int().min(0, 'Price must be 0 or greater'),
  recommended: z.boolean().default(false).optional(),
  client_type: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER']).default('CLIENT').optional(),
  active: z.boolean().default(true).optional(),
  features: z.array(FeatureSchema).default([]),
});

export type CreatePlanInput = z.infer<typeof CreatePlanDTO>;

export const UpdatePlanDTO = z.object({
  name: z.string().min(1, 'Plan name must be at least 1 character').max(255).optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().int().min(0, 'Price must be 0 or greater').optional(),
  recommended: z.boolean().optional(),
  client_type: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER']).optional(),
  active: z.boolean().optional(),
  features: z.array(FeatureSchema).optional(),
});

export type UpdatePlanInput = z.infer<typeof UpdatePlanDTO>;
