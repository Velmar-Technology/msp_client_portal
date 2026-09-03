/**
 * ADR-002: Public API Gateway for Users & Identity feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Pages
export * from './pages/UserManagementPage';

// Components
export * from './components/UserActionsMenu';
export * from './components/UserFiltersBar';
export * from './components/UserRoleBadge';
export * from './components/UserStatsBar';

// Services & API Queries
export * from './api/userService';
export * from './api/useUsersQueries';

// Hooks
export * from './hooks/useUserManagement';
export * from './hooks/useUsersFilters';
export * from './hooks/useUsersModals';

// Ephemeral UI Types
export * from './types';
