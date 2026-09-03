/**
 * ADR-002: Public API Gateway for Tickets feature module.
 * Only public hooks, pages, components, and ephemeral UI types should be exported here.
 */

// Pages
export * from './pages/TicketsPage';
export * from './pages/TicketDetailPage';

// Components
export * from './components/NewTicketModal';
export * from './components/TicketDetailHeader';
export * from './components/TicketDescriptionCard';
export * from './components/TicketResponses';
export * from './components/TicketTimeline';
export * from './components/TicketSidebar';
export * from './components/FilePreviewModal';
export * from './components/ticketUtils';

// Hooks & Queries
export * from './api/ticketService';
export * from './api/useTicketQueries';
export * from './hooks/useTicketsPage';
export * from './hooks/useTicketDetail';
export * from './hooks/useSLATimer';

// Ephemeral UI Types
export * from './types';
