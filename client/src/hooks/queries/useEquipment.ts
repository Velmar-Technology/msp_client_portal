/**
 * Legacy compatibility entry point.
 * Re-exports equipment queries from the canonical feature module per ADR-002.
 */
export {
  EQUIPMENT_QUERY_KEYS,
  useMyDevices,
  useAdminDevices,
  useSubscriptionSlots,
  useActivateWithOtp,
  useDeactivateSlot,
  useRepairSlot,
} from '@/features/equipment';
