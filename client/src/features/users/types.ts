/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, wizard steps, view modes).
 * 
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts" or "./api/userService".
 */

export type UserViewMode = "table" | "grid";
export type UserModalType = "invite" | "edit_role" | "edit_client_type" | "delete_confirm" | "jit_access";
