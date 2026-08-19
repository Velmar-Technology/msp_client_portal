import { z } from 'zod';
import { PlanClientType } from '@shared/types';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '@shared/config/constants';

export const FeatureSchema = z.object({
  code: z.string().optional(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  text: z.union([z.string(), z.record(z.string())]).optional(),
  included: z.boolean(),
});

export const CreatePlanDTO = z.object({
  id: z.string().min(2, 'Plan ID must be at least 2 characters').max(50),
  name: z.union([z.string().min(1, 'Plan name must be at least 1 character').max(255), z.record(z.string().min(1))]),
  description: z.union([z.string(), z.record(z.string())]).nullable().optional(),
  price: z.coerce.number().int().min(0, 'Price must be 0 or greater'),
  recommended: z.boolean().default(false).optional(),
  client_type: z.nativeEnum(PlanClientType).default(PlanClientType.CLIENT).optional(),
  active: z.boolean().default(true).optional(),
  features: z.array(FeatureSchema).default([]),
});

export type CreatePlanInput = z.infer<typeof CreatePlanDTO>;

export const UpdatePlanDTO = z.object({
  name: z.union([z.string().min(1, 'Plan name must be at least 1 character').max(255), z.record(z.string().min(1))]).optional(),
  description: z.union([z.string(), z.record(z.string())]).nullable().optional(),
  price: z.coerce.number().int().min(0, 'Price must be 0 or greater').optional(),
  recommended: z.boolean().optional(),
  client_type: z.nativeEnum(PlanClientType).optional(),
  active: z.boolean().optional(),
  features: z.array(FeatureSchema).optional(),
});

export type UpdatePlanInput = z.infer<typeof UpdatePlanDTO>;

export const PlanQueryDTO = z.object({
  search: z.string().optional(),
  clientType: z.nativeEnum(PlanClientType).optional(),
  page: z.coerce.number().int().positive().optional().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
});
export type PlanQueryInput = z.infer<typeof PlanQueryDTO>;
