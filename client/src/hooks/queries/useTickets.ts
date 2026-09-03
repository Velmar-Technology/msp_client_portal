/**
 * Legacy compatibility entry point.
 * Re-exports ticket queries from the canonical feature module per ADR-002.
 */
export {
  TICKET_QUERY_KEYS,
  useTickets,
  useTicket,
  useCreateTicket,
  useUpdateTicketStatus,
  useAssignTicket,
  useTicketTimeline,
  useTicketAttachments,
  useUploadTicketAttachment,
  useTicketResponses,
  useCreateTicketResponse,
  useTicketSummary,
} from '@/features/tickets';
