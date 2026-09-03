/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, modal states, view filters).
 * 
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts".
 */

export type BillingTab = 'invoices' | 'plans';

export type PaymentMethod = 'card' | 'transfer';

export type BillingModalType = 'pay' | 'markPaid' | 'cancel' | 'details' | null;
