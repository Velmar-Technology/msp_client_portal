/**
 * ADR-002: Public API Gateway for Authentication feature module.
 * Only public hooks, pages, components, services, and ephemeral UI types should be exported here.
 */

// Pages
export * from './pages/LoginPage';
export * from './pages/RegisterPage';

// Services & API Queries
export * from './api/authService';
export * from './api/useAuthQueries';

// Hooks
export * from './hooks/useAuthFilters';
export * from './hooks/useAuthModals';

// Ephemeral UI Types
export * from './types';
