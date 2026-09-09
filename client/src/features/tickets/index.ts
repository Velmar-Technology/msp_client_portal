/**
 * ADR-002: Public API Gateway for Tickets feature module.
 * Only public hooks, pages, components, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Hooks & Queries
export * from './api/ticketService';
export * from './api/useTicketQueries';
export * from './hooks/useTicketsPage';
export * from './hooks/useTicketDetail';
export * from './hooks/useSLATimer';

// Ephemeral UI Types
export * from './types';
