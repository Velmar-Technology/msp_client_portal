/**
 * ADR-002: Public API Gateway for Dashboard feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Hooks & Queries
export * from './api/useDashboardQueries';
export * from './hooks/useAdminDashboard';
export * from './hooks/useClientDashboard';
export * from './hooks/useDashboardFilters';
export * from './hooks/useDashboardModals';

// Components
export * from './components/ElevenDashboardHero';
export * from './components/ClientDashboardView';
export * from './components/AdminDashboardView';

// Ephemeral UI Types
export * from './types';
