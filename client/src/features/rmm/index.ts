/**
 * ADR-002: Public API Gateway for RMM & Maintenance feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Pages
export * from './pages/MaintenancePage';

// Components
export * from './components/ScheduleMaintenanceModal';

// Services & API Queries
export * from './api/rmmService';
export * from './api/maintenanceService';
export * from './api/useRmmQueries';

// Hooks
export * from './hooks/useMaintenance';
export * from './hooks/useRmmDashboard';
export * from './hooks/usePatchManagementModal';
export * from './hooks/useRmmFilters';
export * from './hooks/useRmmModals';

// Ephemeral UI Types
export * from './types';
