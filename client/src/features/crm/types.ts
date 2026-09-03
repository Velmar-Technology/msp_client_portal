/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, wizard steps, view modes).
 * 
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts" or "./api/crmService".
 */

export type CrmViewMode = 'table' | 'kanban';
export type CrmDetailTab = 'activity' | 'quotations' | 'followup' | 'subscription';
export type CrmModalType = 'new-lead' | 'custom-plan' | 'convert-lead';
