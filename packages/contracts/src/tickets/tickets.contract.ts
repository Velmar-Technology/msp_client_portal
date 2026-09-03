import { z } from 'zod';

// ============================================
// Canonical Ticket Enums
// ============================================

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  RESOLVED = 'RESOLVED',
  RESOLVED_AUTOMATED = 'RESOLVED_AUTOMATED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TicketCategory {
  REPAIR = 'REPAIR',
  WARRANTY = 'WARRANTY',
  SERVICE_OUTAGE = 'SERVICE_OUTAGE',
  PREVENTATIVE_MAINTENANCE = 'PREVENTATIVE_MAINTENANCE',
  HELPDESK = 'HELPDESK',
  AI = 'AI',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ============================================
// Zod Enums for Validation
// ============================================

export const TicketStatusSchema = z.nativeEnum(TicketStatus, {
  errorMap: () => ({
    message: 'Status must be OPEN, IN_PROGRESS, AWAITING_PAYMENT, RESOLVED, RESOLVED_AUTOMATED, CLOSED, or CANCELLED',
  }),
});

export const TicketCategorySchema = z.nativeEnum(TicketCategory, {
  errorMap: () => ({
    message: 'Category must be REPAIR, WARRANTY, SERVICE_OUTAGE, PREVENTATIVE_MAINTENANCE, HELPDESK, or AI',
  }),
});

export const TicketPrioritySchema = z.nativeEnum(TicketPriority, {
  errorMap: () => ({
    message: 'Priority must be LOW, MEDIUM, HIGH, or CRITICAL',
  }),
});

// ============================================
// Input Request Contracts
// ============================================

export const CreateTicketInputSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500, 'Title cannot exceed 500 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: TicketCategorySchema,
  priority: TicketPrioritySchema.optional().default(TicketPriority.MEDIUM),
  equipmentId: z.string().uuid('Invalid equipment ID').optional().nullable(),
  clientId: z.string().uuid('Invalid client ID').optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>;

export const UpdateTicketStatusInputSchema = z.object({
  status: TicketStatusSchema,
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
});

export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusInputSchema>;

export const AssignTicketInputSchema = z.object({
  technicianId: z.string().uuid('Invalid technician ID'),
});

export type AssignTicketInput = z.infer<typeof AssignTicketInputSchema>;

export const TicketQuerySchema = z.object({
  status: TicketStatusSchema.optional(),
  category: TicketCategorySchema.optional(),
  priority: TicketPrioritySchema.optional(),
  equipmentId: z.string().uuid().optional(),
  search: z.string().optional(),
  dateRange: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type TicketQueryInput = z.infer<typeof TicketQuerySchema>;

export const TicketIdParamSchema = z.object({
  id: z.string().uuid('Ticket ID Invalid'),
});

export type TicketIdParam = z.infer<typeof TicketIdParamSchema>;

// ============================================
// Entity Response Contracts
// ============================================

export const TicketAttachmentSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  responseId: z.string().uuid().optional().nullable(),
  filename: z.string(),
  path: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
});

export type TicketAttachmentContract = z.infer<typeof TicketAttachmentSchema>;

export const TicketEventSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  oldStatus: z.string().nullable().optional(),
  newStatus: z.string(),
  changedBy: z.string(),
  changedByName: z.string().optional(),
  changedByRole: z.string().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type TicketEventContract = z.infer<typeof TicketEventSchema>;

export const TicketResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: TicketCategorySchema,
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  clientId: z.string().uuid(),
  assignedTechId: z.string().uuid().nullable().optional(),
  equipmentId: z.string().uuid().nullable().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  assignedTechName: z.string().nullable().optional(),
  assignedTechEmail: z.string().nullable().optional(),
  deviceName: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  events: z.array(TicketEventSchema).optional(),
  attachments: z.array(TicketAttachmentSchema).optional(),
});

export type TicketContract = z.infer<typeof TicketResponseSchema>;

export const TicketListResponseSchema = z.object({
  tickets: z.array(TicketResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type TicketListResponseContract = z.infer<typeof TicketListResponseSchema>;
