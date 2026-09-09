/**
 * ADR-002: Public API Gateway for CRM feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// API Services & Queries
export * from './api/crmService';
export * from './api/useCrmQueries';

// Hooks
export * from './hooks/useCrmFilters';
export * from './hooks/useCrmModals';

// Utils
export * from './utils/activityTitles';

// Ephemeral UI Types
export * from './types';
