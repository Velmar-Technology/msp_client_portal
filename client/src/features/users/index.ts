/**
 * ADR-002: Public API Gateway for Users & Identity feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Services & API Queries
export * from './api/userService';
export * from './api/useUsersQueries';

// Hooks
export * from './hooks/useUserManagement';
export * from './hooks/useUsersFilters';
export * from './hooks/useUsersModals';

// Ephemeral UI Types
export * from './types';
