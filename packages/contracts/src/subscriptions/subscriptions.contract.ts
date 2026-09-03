import { z } from 'zod';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PlanClientType {
  CLIENT = 'CLIENT',
  ENTERPRISE = 'ENTERPRISE',
  STUDENT = 'STUDENT',
  OTHER = 'OTHER',
}

export const FeatureSchema = z.object({
  code: z.string().optional(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  text: z.union([z.string(), z.record(z.string())]).optional(),
  included: z.boolean(),
});

export type FeatureContract = z.infer<typeof FeatureSchema>;

export const CreatePlanInputSchema = z.object({
  id: z.string().min(2, 'Plan ID must be at least 2 characters').max(50),
  name: z.union([z.string().min(1, 'Plan name must be at least 1 character').max(255), z.record(z.string().min(1))]),
  description: z.union([z.string(), z.record(z.string())]).nullable().optional(),
  price: z.coerce.number().int().min(0, 'Price must be 0 or greater'),
  recommended: z.boolean().default(false).optional(),
  client_type: z.nativeEnum(PlanClientType).default(PlanClientType.CLIENT),
  active: z.boolean().default(true).optional(),
  features: z.array(FeatureSchema).default([]),
});

export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;

export const UpdatePlanInputSchema = z.object({
  name: z.union([z.string().min(1, 'Plan name must be at least 1 character').max(255), z.record(z.string().min(1))]).optional(),
  description: z.union([z.string(), z.record(z.string())]).nullable().optional(),
  price: z.coerce.number().int().min(0, 'Price must be 0 or greater').optional(),
  recommended: z.boolean().optional(),
  client_type: z.nativeEnum(PlanClientType).optional(),
  active: z.boolean().optional(),
  features: z.array(FeatureSchema).optional(),
});

export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;

export const PlanQuerySchema = z.object({
  search: z.string().optional(),
  clientType: z.nativeEnum(PlanClientType).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type PlanQueryInput = z.infer<typeof PlanQuerySchema>;

export const PlanResponseSchema = z.object({
  id: z.string(),
  name: z.union([z.string(), z.record(z.string())]),
  description: z.union([z.string(), z.record(z.string())]).nullable().optional(),
  price: z.number(),
  recommended: z.boolean(),
  client_type: z.nativeEnum(PlanClientType),
  active: z.boolean(),
  features: z.array(FeatureSchema),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PlanContract = z.infer<typeof PlanResponseSchema>;

export const CreateSubscriptionInputSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(255),
  plan: z.string().min(1, 'Plan is required').max(50),
  equipmentCount: z.coerce.number().int().min(1, 'At least 1 equipment required').max(100),
  clientId: z.string().uuid('Invalid client ID format').optional(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly').optional(),
  paypalOrderId: z.string().optional(),
  paymentMethod: z.enum(['card', 'transfer']).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionInputSchema>;

export const CreatePaypalOrderInputSchema = z.object({
  plan: z.string().min(1, 'Plan is required').max(50),
  equipmentCount: z.coerce.number().int().min(1, 'At least 1 equipment required').max(100),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly').optional(),
  currentSubscriptionId: z.string().uuid().optional(),
});

export type CreatePaypalOrderInput = z.infer<typeof CreatePaypalOrderInputSchema>;

export const UpdateSubscriptionInputSchema = z.object({
  plan: z.string().min(1).max(50).optional(),
  equipmentCount: z.coerce.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  paypalOrderId: z.string().optional(),
});

export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionInputSchema>;

export const SubscriptionResponseSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  service_name: z.string(),
  plan: z.string(),
  status: z.nativeEnum(SubscriptionStatus),
  renewal_date: z.string(),
  equipment_count: z.number().int().min(0),
  paypal_order_id: z.string().nullable().optional(),
  tenant_id: z.string().uuid().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type SubscriptionContract = z.infer<typeof SubscriptionResponseSchema>;
