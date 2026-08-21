import { z } from 'zod';
import { SubscriptionStatus } from '@shared/types';

export const CreateSubscriptionDTO = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(255),
  plan: z.string().min(1, 'Plan is required').max(50),
  equipmentCount: z.coerce.number().int().min(1, 'At least 1 equipment required').max(100),
  clientId: z.string().uuid('Invalid client ID format').optional(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly').optional(),
  paypalOrderId: z.string().optional(),
  paymentMethod: z.enum(['card', 'transfer']).optional(),
});
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionDTO>;

export const CreatePaypalOrderDTO = z.object({
  plan: z.string().min(1, 'Plan is required').max(50),
  equipmentCount: z.coerce.number().int().min(1, 'At least 1 equipment required').max(100),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly').optional(),
  currentSubscriptionId: z.string().uuid().optional(),
});
export type CreatePaypalOrderInput = z.infer<typeof CreatePaypalOrderDTO>;

export const UpdateSubscriptionDTO = z.object({
  plan: z.string().min(1).max(50).optional(),
  equipmentCount: z.coerce.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  paypalOrderId: z.string().optional(),
});
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionDTO>;

