/**
 * Legacy compatibility entry point.
 * Deprecated per ADR-002: Import directly from '@/features/subscriptions'.
 */
export * from '@/features/subscriptions';
export { planService as default, planService } from '@/features/subscriptions';
