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

export const TicketCategorySchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const norm = val.trim().toUpperCase();
    if (norm === 'HARDWARE') return TicketCategory.REPAIR;
    if (norm === 'NETWORK') return TicketCategory.SERVICE_OUTAGE;
    if (norm === 'SOFTWARE' || norm === 'ACCESS') return TicketCategory.HELPDESK;
    return norm;
  }
  return val;
}, z.nativeEnum(TicketCategory, {
  errorMap: () => ({
    message: 'Category must be REPAIR, WARRANTY, SERVICE_OUTAGE, PREVENTATIVE_MAINTENANCE, HELPDESK, or AI',
  }),
}));

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

export const AgentFlightRecorderSchema = z.object({
  os: z.string().optional(),
  osVersion: z.string().optional(),
  uptimeSeconds: z.number().optional(),
  cpuUsagePercent: z.number().optional(),
  memoryUsagePercent: z.number().optional(),
  memoryTotalBytes: z.number().optional(),
  memoryUsedBytes: z.number().optional(),
  diskUsagePercent: z.number().optional(),
  activeWindowTitle: z.string().optional(),
  topProcesses: z.array(z.object({
    name: z.string(),
    pid: z.number().optional(),
    cpuPercent: z.number().optional(),
    memoryBytes: z.number().optional(),
  })).optional(),
  recentEventErrors: z.array(z.object({
    source: z.string(),
    eventId: z.number().optional(),
    message: z.string(),
    timestamp: z.string().optional(),
  })).optional(),
}).passthrough();

export type AgentFlightRecorder = z.infer<typeof AgentFlightRecorderSchema>;

export const CreateAgentTicketInputSchema = z.object({
  reporterName: z.string().min(2, 'Reporter name must be at least 2 characters').max(255),
  reporterEmail: z.string().email('Invalid reporter email address'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: TicketCategorySchema.optional().default(TicketCategory.HELPDESK),
  priority: TicketPrioritySchema.optional().default(TicketPriority.MEDIUM),
  screenshotBase64: z.string().optional(),
  deviceSnapshot: AgentFlightRecorderSchema.optional(),
});

export type CreateAgentTicketInput = z.infer<typeof CreateAgentTicketInputSchema>;

export const CreateAgentTicketResponseSchema = z.object({
  ticketId: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  title: z.string(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  category: TicketCategorySchema,
  assigned_tech_id: z.string().nullable().optional(),
  assignedTechName: z.string().nullable().optional(),
  reporterName: z.string().optional(),
  reporter_name: z.string().nullable().optional(),
  reporterEmail: z.string().optional(),
  reporter_email: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  created_at: z.union([z.string(), z.date()]).optional(),
}).passthrough();

export type CreateAgentTicketResponse = z.infer<typeof CreateAgentTicketResponseSchema>;

export const AddAgentTicketResponseInputSchema = z.object({
  reporterName: z.string().min(2, 'Reporter name must be at least 2 characters').max(255),
  message: z.string().min(1, 'Message cannot be empty'),
  screenshotBase64: z.string().optional(),
});

export type AddAgentTicketResponseInput = z.infer<typeof AddAgentTicketResponseInputSchema>;

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
  reporterName: z.string().nullable().optional(),
  reporterEmail: z.string().nullable().optional(),
  source: z.string().optional(),
  deviceSnapshot: AgentFlightRecorderSchema.nullable().optional(),
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

// ============================================
// Agent Workstation Contracts
// ============================================

export const AgentActiveTicketResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  category: TicketCategorySchema,
  assignedTechId: z.string().uuid().nullable().optional(),
  assignedTechName: z.string().nullable().optional(),
  equipmentId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AgentActiveTicketResponse = z.infer<typeof AgentActiveTicketResponseSchema>;

export const AgentTicketMessageSchema = z.object({
  id: z.string().uuid(),
  authorName: z.string(),
  authorRole: z.string(),
  message: z.string(),
  isInternal: z.boolean().optional(),
  attachments: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export type AgentTicketMessage = z.infer<typeof AgentTicketMessageSchema>;

export const AgentTicketMessagesResponseSchema = z.array(AgentTicketMessageSchema);
export type AgentTicketMessagesResponse = z.infer<typeof AgentTicketMessagesResponseSchema>;

export const AgentUpdateTicketStatusInputSchema = z.object({
  status: z.enum(['RESOLVED', 'CLOSED']).default('RESOLVED'),
});

export type AgentUpdateTicketStatusInput = z.infer<typeof AgentUpdateTicketStatusInputSchema>;

export const AgentTicketListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  category: TicketCategorySchema,
  assignedTechId: z.string().uuid().nullable().optional(),
  assignedTechName: z.string().nullable().optional(),
  equipmentId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AgentTicketListItem = z.infer<typeof AgentTicketListItemSchema>;

export const AgentTicketListResponseSchema = z.array(AgentTicketListItemSchema);
export type AgentTicketListResponse = z.infer<typeof AgentTicketListResponseSchema>;

// ============================================
// Ticket Responses / Chatter Contracts
// ============================================

export const TicketReplyMessageSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  message: z.string(),
  authorName: z.string().nullable().optional(),
  authorRole: z.string().optional(),
  userName: z.string().optional(),
  userRole: z.string().optional(),
  isInternal: z.boolean().default(false),
  tenantId: z.string().uuid().optional(),
  createdAt: z.string(),
  attachments: z.array(TicketAttachmentSchema).optional(),
});

export type TicketReplyMessageContract = z.infer<typeof TicketReplyMessageSchema>;

export const AddTicketReplyInputSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  isInternal: z.boolean().optional().default(false),
});

export type AddTicketReplyInput = z.infer<typeof AddTicketReplyInputSchema>;


