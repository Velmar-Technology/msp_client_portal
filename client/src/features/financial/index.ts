/**
 * ADR-002: Public API Gateway for Financial & OpEx feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Services & API Queries
export * from './api/earningsService';
export * from './api/expenseService';
export * from './api/useFinancialQueries';

// Hooks
export * from './hooks/useFinancialDashboard';
export * from './hooks/useFinancialFilters';
export * from './hooks/useFinancialModals';

// Ephemeral UI Types
export * from './types';
