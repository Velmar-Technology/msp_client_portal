/**
 * ADR-002: Public API Gateway for Authentication feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Services & API Queries
export * from './api/authService';
export * from './api/useAuthQueries';

// Hooks
export * from './hooks/useAuthFilters';
export * from './hooks/useAuthModals';

// Ephemeral UI Types
export * from './types';
