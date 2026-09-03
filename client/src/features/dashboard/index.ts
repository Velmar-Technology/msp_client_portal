/**
 * ADR-002: Public API Gateway for Dashboard feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Pages
export * from './pages/DashboardPage';
export * from './pages/TechDashboardPage';

// Components
export * from './components/ActiveSubscriptions';
export * from './components/AdminDashboardView';
export * from './components/ClientDashboardView';
export * from './components/DashboardSummaryStats';
export * from './components/RecentInvoices';
export * from './components/StorageQuota';

// Hooks & Queries
export * from './api/useDashboardQueries';
export * from './hooks/useAdminDashboard';
export * from './hooks/useClientDashboard';
export * from './hooks/useDashboardFilters';
export * from './hooks/useDashboardModals';

// Ephemeral UI Types
export * from './types';
