/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, modal states, view modes).
 *
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts".
 */

export type TicketDateRange = 'all' | 'today' | '7d' | '30d' | '90d';
export type TicketDetailTab = 'details' | 'timeline' | 'responses';
export type TicketViewMode = 'table' | 'cards';
