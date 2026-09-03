/**
 * Legacy compatibility entry point.
 * Re-exports useSLATimer from the canonical feature module per ADR-002.
 */
export { useSLATimer as default, useSLATimer, type SLATimerTicketInput } from '@/features/tickets';
