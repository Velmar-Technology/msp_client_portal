/**
 * Legacy compatibility entry point.
 * Re-exports ticket components from the canonical feature module per ADR-002.
 */
export {
  NewTicketModal,
  type NewTicketModalProps,
  TicketDetailHeader,
  type TicketDetailHeaderProps,
  TicketDescriptionCard,
  type TicketDescriptionCardProps,
  TicketResponses,
  type TicketResponsesProps,
  TicketTimeline,
  type TicketTimelineProps,
  TicketSidebar,
  type TicketSidebarProps,
  FilePreviewModal,
  type FilePreviewModalProps,
  type PreviewFileState,
} from '@/features/tickets';
