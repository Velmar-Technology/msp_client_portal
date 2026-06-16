import { z } from 'zod';
import { SubscriptionPlan } from '../types';

export const CreateSubscriptionDTO = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(255),
  plan: z.nativeEnum(SubscriptionPlan, {
    errorMap: () => ({ message: 'Plan must be BASIC, STANDARD, or PREMIUM' }),
  }),
  equipmentCount: z.coerce.number().int().min(1, 'At least 1 equipment required').max(100),
});
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionDTO>;

export const UpdateSubscriptionDTO = z.object({
  plan: z.nativeEnum(SubscriptionPlan).optional(),
  equipmentCount: z.coerce.number().int().min(1).max(100).optional(),
});
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionDTO>;
