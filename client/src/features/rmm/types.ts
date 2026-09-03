/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, wizard steps, view modes).
 * 
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts" or "./api/rmmService" / "./api/maintenanceService".
 */

export type RmmTab = 'overview' | 'maintenances' | 'patches' | 'telemetry';
export type MaintenanceModalType = 'schedule' | 'edit' | 'patch-details';
