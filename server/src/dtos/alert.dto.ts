import { z } from 'zod';
import { TicketPriority } from '../types';

export const ProcessRmmAlertDTO = z.object({
  alertType: z.string().min(1, 'alertType is required').max(255),
  assetId: z.string().min(1, 'assetId is required').max(255),
  clientId: z.string().uuid('Invalid client ID'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  executionTimeMs: z.coerce.number().nonnegative('executionTimeMs must be non-negative').default(0),
  priority: z.nativeEnum(TicketPriority).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  createdByUserId: z.string().uuid('Invalid createdByUserId').optional(),
});
export type ProcessRmmAlertInput = z.infer<typeof ProcessRmmAlertDTO>;
