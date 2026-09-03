/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, wizard steps, view modes).
 * 
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts" or "./api/earningsService" / "./api/expenseService".
 */

export type FinancialTab = "overview" | "transactions" | "payroll" | "rates";
export type FinancialModalType = "log_expense" | "technician_rates" | "batch_payout";
