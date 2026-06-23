import { z } from 'zod';
import { SubscriptionPlan, SubscriptionStatus } from '../types';

export const CreateSubscriptionDTO = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(255),
  plan: z.nativeEnum(SubscriptionPlan, {
    errorMap: () => ({ message: 'Invalid plan selected' }),
  }),
  equipmentCount: z.coerce.number().int().min(1, 'At least 1 equipment required').max(100),
  clientId: z.string().uuid('Invalid client ID format').optional(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly').optional(),
});
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionDTO>;

export const UpdateSubscriptionDTO = z.object({
  plan: z.nativeEnum(SubscriptionPlan).optional(),
  equipmentCount: z.coerce.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
});
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionDTO>;
