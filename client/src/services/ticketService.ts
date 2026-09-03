/**
 * Legacy compatibility entry point.
 * Deprecated per ADR-002: Import directly from '@/features/tickets' or '@shared/contracts'.
 */
import type {
  TicketContract,
  TicketAttachmentContract,
  TicketEventContract,
  CreateTicketInput,
} from '@shared/contracts';

export type Ticket = TicketContract;
export type TicketAttachment = TicketAttachmentContract;
export type TicketEvent = TicketEventContract;
export type CreateTicketPayload = CreateTicketInput | {
  title: string;
  description: string;
  category: string;
  priority?: string;
  equipmentId?: string | null;
  clientId?: string;
};

export interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  tenant_id: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
  attachments?: TicketAttachment[];
}

export { ticketService as default, ticketService } from '@/features/tickets';
