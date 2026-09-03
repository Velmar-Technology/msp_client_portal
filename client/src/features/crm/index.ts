/**
 * ADR-002: Public API Gateway for CRM feature module.
 * Only public hooks, pages, components, services, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Pages
export * from './pages/CRMPage';
export * from './pages/CRMCustomPlanPage';

// Components
export * from './components/CRMDataTable';
export * from './components/CRMKanbanBoard';
export * from './components/CRMLeadDetailSheet';
export * from './components/CRMNewLeadModal';
export * from './components/detail/ActivityTimelineTab';
export * from './components/detail/DeleteActivityDialog';
export * from './components/detail/DeleteLeadDialog';
export * from './components/detail/EditActivityDialog';
export * from './components/detail/FollowUpTab';
export * from './components/detail/QuotationTab';
export * from './components/detail/SubscriptionTab';

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
