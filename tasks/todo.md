# Implementation Tasks: Slice 2 — Billing & Invoices Migration

## Phase 1: Shared Contract Foundation (`packages/contracts`)

### Task 13: Define Billing & Expense API Contracts & Zod Schemas
**Description:** Define canonical Zod contracts and TypeScript types in `@shared/contracts/src/billing/` for invoices, line items, PayPal checkout capture, cancellation, and expenses.
**Acceptance criteria:**
- [ ] `InvoiceQuerySchema` validates page and limit.
- [ ] `CapturePaypalOrderSchema` validates required `orderId`.
- [ ] `CancelInvoiceSchema` validates optional `reason`.
- [ ] `InvoiceResponseSchema` validates full invoice entity with line items, tax, NCF, and status.
- [ ] `CreateExpenseInputSchema` validates amount, description, category, and optional date/identifier.
- [ ] `FinancialStatsResponseSchema` validates analytics breakdowns.
- [ ] Unit tests pass in `packages/contracts/src/billing/billing.contract.test.ts`.
**Verification:**
- [ ] `npm -w packages/contracts run test`
- [ ] `npm run build:packages`
**Dependencies:** None  
**Files touched:**
- `packages/contracts/src/billing/billing.contract.ts`
- `packages/contracts/src/billing/billing.contract.test.ts`
- `packages/contracts/src/index.ts`
**Estimated scope:** Small (3 files)

---

## Checkpoint: Contracts Foundation
- [ ] `@shared/contracts` builds cleanly with dual ESM/CJS outputs (`npm run build:packages`).
- [ ] All billing contract unit tests pass.

---

## Phase 2: Server Route Validation Integration (`server`)

### Task 14: Wire `@shared/contracts` on Billing & Expense Express Routes
**Description:** Create `server/src/shared/dtos/billing.dto.ts` re-exporting from `@shared/contracts`. Add `validate()` middleware to `invoice.routes.ts` and `expense.routes.ts`.
**Acceptance criteria:**
- [ ] `invoice.routes.ts` validates `capture-paypal-order` and `cancel` with shared contracts.
- [ ] `expense.routes.ts` validates `POST /` with `CreateExpenseInputSchema`.
- [ ] Zero regressions to existing controller logic.
**Verification:**
- [ ] `npx vitest run src/modules/billing/` passes completely (75 tests).
**Dependencies:** Task 13  
**Files touched:**
- `server/src/shared/dtos/billing.dto.ts`
- `server/src/modules/billing/routes/invoice.routes.ts`
- `server/src/modules/billing/routes/expense.routes.ts`
**Estimated scope:** Small (3 files)

---

## Checkpoint: Server Validation
- [ ] Server DTOs re-export cleanly with zero type errors.
- [ ] All 75 billing backend unit tests remain green.

---

## Phase 3: Colocated Frontend Feature (`client/src/features/billing/`)

### Task 15: Implement Colocated Billing Feature API & Query Hooks
**Description:** Implement `client/src/features/billing/api/useBillingQueries.ts` with standardized query keys and automated cache invalidation on payment capture, admin settlement, and expense creation.
**Acceptance criteria:**
- [ ] Query keys defined using `BILLING_QUERY_KEYS` factory.
- [ ] `useInvoices`, `useInvoice`, `useExpenses`, `useFinancialStats` queries implemented.
- [ ] `useCapturePaypalOrder`, `useMarkInvoicePaid`, and `useCancelInvoice` mutations invalidate billing cache.
- [ ] Unit tests pass in `client/src/features/billing/api/useBillingQueries.test.tsx`.
**Verification:**
- [ ] `npx vitest run src/features/billing/` passes.
**Dependencies:** Task 14  
**Files touched:**
- `client/src/features/billing/api/useBillingQueries.ts`
- `client/src/features/billing/api/useBillingQueries.test.tsx`
- `client/src/features/billing/index.ts`
**Estimated scope:** Medium (3 files)

---

### Task 16: Refactor Services & Connect `BillingPage`
**Description:** Refactor `invoiceService.ts` and `expenseService.ts` to import types from `@shared/contracts`. Connect `BillingPage` to the new query hooks from `@/features/billing`.
**Acceptance criteria:**
- [ ] `invoiceService.ts` and `expenseService.ts` import entity contracts from `@shared/contracts`.
- [ ] `BillingPage.tsx` consumes `useInvoices`, `useCapturePaypalOrder`, and `useMarkInvoicePaid`.
- [ ] Automatic table refresh upon PayPal capture or admin mark-as-paid.
**Verification:**
- [ ] `npx vitest run src/pages/BillingPage/BillingPage.test.tsx` passes.
- [ ] `npm -w client run build` succeeds with zero errors.
**Dependencies:** Task 15  
**Files touched:**
- `client/src/services/invoiceService.ts`
- `client/src/services/expenseService.ts`
- `client/src/pages/BillingPage/BillingPage.tsx`
**Estimated scope:** Medium (3 files)

---

## Checkpoint: Slice 2 Complete
- [ ] Packages and client compile cleanly (`npm run build:packages`, `npm -w client run build`).
- [ ] All billing test suites pass with zero regressions.
- [ ] Working tree clean and ready to commit as Slice 2.
