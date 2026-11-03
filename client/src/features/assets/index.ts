/**
 * ADR-002 / ADR-003: Public API Gateway for Assets feature module.
 * Only public hooks, components, routes, and ephemeral UI types should be exported here.
 */

// Routes & Manifest
export * from './routes';
export * from './manifest';

// Components
export * from './components/AssetsTable';
export * from './components/AssetsModal';
export * from './components/ConsumablesTable';
export * from './components/CreateConsumableModal';
export * from './components/CheckoutConsumableModal';
export * from './components/RestockConsumableModal';
export * from './components/ConsumableHistoryModal';

// Hooks & Queries
export * from './api/useAssetsQueries';
export * from './api/assetsService';
export * from './hooks/useAssetsFilters';
export * from './hooks/useAssetsModals';

// Ephemeral UI Types
export * from './types';

// Sub-Features (ADR-017)
export * as consumables from './consumables';

