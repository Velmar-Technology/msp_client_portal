import { z } from 'zod';

export const FeatureSchema = z.object({
  text: z.string().min(1, 'Feature text is required'),
  included: z.boolean(),
});

export const UpdatePlanDTO = z.object({
  name: z.string().min(1, 'Plan name must be at least 1 character').max(255).optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().int().min(0, 'Price must be 0 or greater').optional(),
  recommended: z.boolean().optional(),
  features: z.array(FeatureSchema).optional(),
});

export type UpdatePlanInput = z.infer<typeof UpdatePlanDTO>;
