import { z } from 'zod';
import { TicketCategory, TicketPriority, TicketStatus } from '../types';

export const CreateTicketDTO = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.nativeEnum(TicketCategory, {
    errorMap: () => ({ message: 'Category must be REPAIR, WARRANTY, or SERVICE_OUTAGE' }),
  }),
  priority: z.nativeEnum(TicketPriority).optional().default(TicketPriority.MEDIUM),
});
export type CreateTicketInput = z.infer<typeof CreateTicketDTO>;

export const UpdateTicketStatusDTO = z.object({
  status: z.nativeEnum(TicketStatus, {
    errorMap: () => ({
      message: 'Invalid status. Must be: OPEN, IN_PROGRESS, AWAITING_PAYMENT, RESOLVED, CLOSED, or CANCELLED',
    }),
  }),
  notes: z.string().max(2000).optional(),
});
export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusDTO>;

export const TicketQueryDTO = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type TicketQueryInput = z.infer<typeof TicketQueryDTO>;

export const AssignTicketDTO = z.object({
  technicianId: z.string().uuid('Invalid technician ID'),
});
export type AssignTicketInput = z.infer<typeof AssignTicketDTO>;

export const CreateTicketResponseDTO = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000),
});
export type CreateTicketResponseInput = z.infer<typeof CreateTicketResponseDTO>;

