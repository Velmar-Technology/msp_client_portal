/**
 * ADR-002: Public API Gateway for Equipment & Devices feature module.
 * Only public pages, components, hooks, queries, routes, and ephemeral types should be exported here.
 */

// Routes
export * from './routes';

// Pages
export * from './pages/DevicesPage';
export { DevicesPage as default } from './pages/DevicesPage';

// Components
export * from './components/ActivateWithOtpModal';
export * from './components/AddAdminDeviceModal';
export * from './components/DeployAgentModal';
export * from './components/NextcloudInfoModal';

// Hooks
export * from './hooks/useDeviceFilters';
export * from './hooks/useDeviceModals';
export * from './hooks/useDevicesPage';

// Queries and Services
export * from './api/useEquipmentQueries';
export * from './api/equipmentService';

// Ephemeral UI Types
export * from './types';
