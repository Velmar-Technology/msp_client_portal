import { z } from 'zod';
import { LeadStage, LeadPriority, QuotationStatus } from '@shared/types';

export const CreateLeadDTO = z.object({
  clientId: z.string().uuid('Invalid client ID format').optional().nullable(),
  contactName: z.string().min(1, 'Contact name is required').max(255),
  contactEmail: z.string().email('Invalid contact email format').max(255),
  contactPhone: z.string().max(50).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  stage: z.nativeEnum(LeadStage).default(LeadStage.NEW).optional(),
  planId: z.string().max(50).optional().nullable(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly').optional(),
  equipmentCount: z.coerce.number().int().min(1).max(500).default(1).optional(),
  expectedRevenue: z.coerce.number().min(0).default(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).default(10).optional(),
  priority: z.nativeEnum(LeadPriority).default(LeadPriority.MEDIUM).optional(),
  assignedUserId: z.string().uuid('Invalid assigned user ID').optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadDTO>;

export const UpdateLeadDTO = z.object({
  clientId: z.string().uuid().optional().nullable(),
  contactName: z.string().min(1).max(255).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().max(50).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  stage: z.nativeEnum(LeadStage).optional(),
  planId: z.string().max(50).optional().nullable(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
  equipmentCount: z.coerce.number().int().min(1).max(500).optional(),
  expectedRevenue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  assignedUserId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  lostReason: z.string().max(255).optional().nullable(),
});
export type UpdateLeadInput = z.infer<typeof UpdateLeadDTO>;

export const UpdateLeadStageDTO = z.object({
  stage: z.nativeEnum(LeadStage),
  lostReason: z.string().max(255).optional().nullable(),
});
export type UpdateLeadStageInput = z.infer<typeof UpdateLeadStageDTO>;

export const SendCrmQuotationDTO = z.object({
  leadId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  recipientName: z.string().min(1, 'Recipient name is required').max(255),
  recipientEmail: z.string().email('Recipient email is required').max(255),
  planId: z.string().min(1, 'Plan is required').max(50),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
  equipmentCount: z.coerce.number().int().min(1).max(500).default(1),
  validDays: z.coerce.number().int().min(1).max(90).default(30).optional(),
  notes: z.string().optional().nullable(),
});
export type SendCrmQuotationInput = z.infer<typeof SendCrmQuotationDTO>;

export const ResendCrmQuotationDTO = z.object({
  quotationId: z.string().uuid('Invalid quotation ID'),
  isReminder: z.boolean().default(true).optional(),
  customMessage: z.string().optional().nullable(),
});
export type ResendCrmQuotationInput = z.infer<typeof ResendCrmQuotationDTO>;

export const ConvertLeadToSubscriptionDTO = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  planId: z.string().max(50).optional(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly').optional(),
  equipmentCount: z.coerce.number().int().min(1).max(500).default(1).optional(),
  paymentMethod: z.enum(['card', 'transfer']).default('transfer').optional(),
});
export type ConvertLeadToSubscriptionInput = z.infer<typeof ConvertLeadToSubscriptionDTO>;

export const CreateLeadActivityDTO = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  activityType: z.enum([
    'EMAIL_SENT',
    'QUOTE_SENT',
    'QUOTE_REMINDER',
    'QUOTE_STATUS_CHANGE',
    'CALL',
    'MEETING',
    'NOTE',
    'STAGE_CHANGE',
    'PLAN_ASSIGNED',
    'SUB_MODIFIED',
  ]),
  title: z.string().min(1, 'Activity title is required').max(255),
  summary: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('COMPLETED').optional(),
});
export type CreateLeadActivityInput = z.infer<typeof CreateLeadActivityDTO>;

export const UpdateQuotationStatusDTO = z.object({
  status: z.nativeEnum(QuotationStatus),
});
export type UpdateQuotationStatusInput = z.infer<typeof UpdateQuotationStatusDTO>;

export const ModifySubscriptionDTO = z.object({
  subId: z.string().uuid('Invalid subscription ID'),
  planId: z.string().min(1, 'Plan is required').max(50),
  equipmentCount: z.coerce.number().int('Equipment count must be an integer').min(1, 'At least 1 device required').max(500),
  leadId: z.string().uuid('Invalid lead ID').optional(),
});
export type ModifySubscriptionInput = z.infer<typeof ModifySubscriptionDTO>;

export const CancelSubscriptionDTO = z.object({
  subId: z.string().uuid('Invalid subscription ID'),
  leadId: z.string().uuid('Invalid lead ID').optional(),
});
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionDTO>;

export const UpdateLeadActivityDTO = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  summary: z.string().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});
export type UpdateLeadActivityInput = z.infer<typeof UpdateLeadActivityDTO>;

export const GetLeadsQueryDTO = z.object({
  search: z.string().optional(),
  stage: z.nativeEnum(LeadStage).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  assignedUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
export type GetLeadsQueryInput = z.infer<typeof GetLeadsQueryDTO>;
