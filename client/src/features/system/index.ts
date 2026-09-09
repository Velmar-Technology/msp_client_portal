/**
 * ADR-002: Public API Gateway for System & Health feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Services & API Queries
export * from './api/systemService';
export * from './api/useSystemQueries';

// Hooks
export * from './hooks/useApiStatus';
export * from './hooks/useSystemFilters';
export * from './hooks/useSystemModals';

// Ephemeral UI Types
export * from './types';
