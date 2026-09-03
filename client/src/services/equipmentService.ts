/**
 * Legacy compatibility entry point.
 * Re-exports equipmentService from the canonical feature module per ADR-002.
 */
export { equipmentService } from '@/features/equipment';
export type { SubscriptionEquipment } from '@shared/contracts';
