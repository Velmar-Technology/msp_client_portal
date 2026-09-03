/**
 * Legacy compatibility entry point.
 * Re-exports useDeviceFilters from the canonical feature module per ADR-002.
 */
export {
  useDeviceFilters,
  deriveAdminFilterOptions,
  deriveUniqueClients,
  filterEquipment,
  sortEquipment,
} from '@/features/equipment';
