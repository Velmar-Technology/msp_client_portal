# Task Breakdown: BL-702 Graceful Password Vault Non-Payment Handling

## Phase 1: Database Schema & Contracts

### Task 1.1: Add Tenant Vault Grace Columns to PostgreSQL & Drizzle
**Description:** Add `vault_grace_extension_until` (timestamp) and `vault_grace_extensions_count` (integer default 0) to `tenants` table schema via migration `041_add_tenant_vault_grace_columns.sql` and update Drizzle schema definitions.
**Acceptance criteria:**
- [x] Migration `041_add_tenant_vault_grace_columns.sql` created in `server/src/shared/db/migrations/`.
- [x] `tenants` Drizzle table in `server/src/shared/db/schema.ts` includes the two new columns with default values.
- [x] Domain types in `server/src/shared/types/index.ts` updated.
**Verification:**
- [x] `npm -w server run build` compiles cleanly.
**Dependencies:** None
**Files touched:**
- `server/src/shared/db/migrations/041_add_tenant_vault_grace_columns.sql`
- `server/src/shared/db/schema.ts`
- `server/src/shared/types/index.ts`
**Estimated scope:** Small (3 files)

---

### Task 1.2: Define Vault Grace API Contracts in `@shared/contracts`
**Description:** Define request and response schemas for requesting a 24-hour vault grace extension in `@shared/contracts`.
**Acceptance criteria:**
- [x] `RequestVaultGraceInputSchema` created (optional notes/reason).
- [x] `VaultGraceStatusResponseSchema` created (fields: `granted: boolean`, `graceUntil: string`, `extensionsCount: number`, `message: string`).
- [x] Schemas and types re-exported from `@shared/contracts`.
**Verification:**
- [x] `npm run build:packages` succeeds with exit code 0.
**Dependencies:** None
**Files touched:**
- `packages/contracts/src/billing/billing.contract.ts`
- `packages/contracts/src/index.ts`
**Estimated scope:** Small (2 files)

---

## Checkpoint 1: Database Schema & Contracts Active
- [x] `npm run build:packages` succeeds.
- [x] `npm -w server run build` passes.

---

## Phase 2: Backend Vaultwarden & Non-Payment Scale Services

### Task 2.1: Implement Read-Only and Encrypted Export in `VaultwardenService`
**Description:** Add methods to `VaultwardenService` to toggle organization read-only permissions and generate encrypted organization vault exports, with graceful mock simulation for test/dev environments.
**Acceptance criteria:**
- [x] `setOrganizationReadOnly(orgId: string, readOnly: boolean)` updates collection access policies to read-only.
- [x] `exportOrganizationEncrypted(orgId: string)` retrieves an encrypted backup of the tenant organization's vault.
- [x] Offline simulation mode supported when `VAULTWARDEN_ADMIN_TOKEN` is not present.
**Verification:**
- [x] `VaultwardenService.test.ts` passes with new test cases (19/19 tests passing).
**Dependencies:** Checkpoint 1
**Files touched:**
- `server/src/modules/system/services/VaultwardenService.ts`
- `server/src/modules/system/services/VaultwardenService.test.ts`
**Estimated scope:** Medium (2 files)

---

### Task 2.2: Integrate Graceful Vault Lifecycle into `NonPaymentSuspensionService`
**Description:** Enhance `NonPaymentSuspensionService.evaluateOverdueAccounts` to freeze Vaultwarden collections to read-only on Day 5, check active grace periods on Day 15 before suspending access, and dispatch an encrypted export before purging on Day 30.
**Acceptance criteria:**
- [x] Day 5 (`READ_ONLY`): Calls `vaultwardenSvc.setOrganizationReadOnly(tenantId, true)`.
- [x] Day 15 (`SUSPENDED`): If `tenant.vault_grace_extension_until > now`, skips user lockout and logs grace active; otherwise locks out users.
- [x] Day 30 (`PURGED`): Generates encrypted export, dispatches email to Client Admin, then executes deletion.
- [x] `restoreAccountIfPaid`: When all invoices settled, unfreezes collections (`setOrganizationReadOnly(tenantId, false)`) and resets grace counters.
**Verification:**
- [x] `npx vitest run src/modules/billing/services/NonPaymentSuspensionService.test.ts` passes 100% (12/12 tests passing).
**Dependencies:** Task 2.1
**Files touched:**
- `server/src/modules/billing/services/NonPaymentSuspensionService.ts`
- `server/src/modules/billing/services/NonPaymentSuspensionService.test.ts`
- `server/src/shared/utils/emailService.ts`
**Estimated scope:** Medium (3 files)

---

### Task 2.3: Implement Grace Extension Endpoint in Billing Domain
**Description:** Add service method, controller action, and Express route `POST /api/v1/invoices/request-vault-grace` allowing Client Admins to request a 24-hour grace extension.
**Acceptance criteria:**
- [x] Validates caller is client admin or admin for the tenant.
- [x] Rejects with `ConflictError` if grace extension was already used during the current overdue cycle (`extensionsCount >= 1`).
- [x] Sets `vault_grace_extension_until = now + 24h` and increments counter.
- [x] Temporarily restores Vaultwarden access during active grace period.
**Verification:**
- [x] Unit/integration tests pass for billing grace endpoint.
**Dependencies:** Task 2.2
**Files touched:**
- `server/src/modules/billing/services/NonPaymentSuspensionService.ts`
- `server/src/modules/billing/controllers/InvoiceController.ts`
- `server/src/modules/billing/routes/invoice.routes.ts`
**Estimated scope:** Medium (3 files)

---

## Checkpoint 2: Backend Logic Verified
- [x] `npm -w server run test` passes with zero regressions (79/79 suites, 772/772 tests passing).
- [x] `npm -w server run build` compiles cleanly.

---

## Phase 3: Frontend Client Portal Integration

### Task 3.1: Add Billing Grace Mutation Hook & Service
**Description:** Add `requestVaultGrace` to `invoiceService.ts` and `useRequestVaultGrace` mutation hook in `client/src/features/billing/`.
**Acceptance criteria:**
- [x] Service method calls `POST /api/v1/invoices/request-vault-grace`.
- [x] React Query mutation invalidates billing and tenant queries on success.
**Verification:**
- [x] `npm -w client run build` compiles without type errors.
**Dependencies:** Checkpoint 2
**Files touched:**
- `client/src/features/billing/api/invoiceService.ts`
- `client/src/features/billing/api/useBillingQueries.ts`
**Estimated scope:** Small (2 files)

---

### Task 3.2: Implement Non-Payment Status Card & Grace Button in `BillingPage.tsx`
**Description:** Display a non-payment notification banner/card in `BillingPage.tsx` when account is in `READ_ONLY` or `SUSPENDED` state, including a 1-click "Request 24h Emergency Access" button with confirmation modal.
**Acceptance criteria:**
- [x] Shows countdown/warning of non-payment scale and current account status badge.
- [x] "Request 24h Emergency Access" button visible if grace period has not been used.
- [x] Confirmation dialog explaining that this is a 1-time 24h extension per cycle.
- [x] Success toast and instant query cache refresh upon activation.
**Verification:**
- [x] `BillingPage.test.tsx` passes with assertions verifying grace button interaction (6/6 tests passing).
**Dependencies:** Task 3.1
**Files touched:**
- `client/src/features/billing/pages/BillingPage.tsx`
- `client/src/features/billing/pages/BillingPage.test.tsx`
**Estimated scope:** Medium (2 files)

---

### Task 3.3: Add Read-Only Notice in `PasswordManagerPage.tsx`
**Description:** When tenant account status is `READ_ONLY`, display an amber notice on `PasswordManagerPage.tsx` informing users that the vault is in Read-Only mode and credential creation/edits are locked until invoice settlement.
**Acceptance criteria:**
- [x] Displays non-intrusive amber alert banner explaining Read-Only mode.
- [x] Button linking directly to `/billing`.
**Verification:**
- [x] Component test in `PasswordManagerPage.test.tsx` passes (4/4 tests passing).
**Dependencies:** Task 3.2
**Files touched:**
- `client/src/features/settings/pages/PasswordManagerPage.tsx`
- `client/src/features/settings/pages/PasswordManagerPage.test.tsx`
**Estimated scope:** Small (2 files)

---

### Task 3.4: Bilingual Localization Strings (English & Spanish)
**Description:** Add all new translation strings for non-payment notices, grace requests, and read-only status in `en_US.json` and `es_DO.json`.
**Acceptance criteria:**
- [x] Zero hardcoded user-facing strings.
- [x] English strings in `en_US.json` and Dominican Spanish in `es_DO.json`.
**Verification:**
- [x] Translation key checks pass.
**Dependencies:** Tasks 3.2 & 3.3
**Files touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`
**Estimated scope:** Small (2 files)

---

## Checkpoint 3: Full Feature Verification
- [x] `npm run build:packages` succeeds with exit code 0.
- [x] `npm -w server run test` passes with zero regressions (79/79 suites, 772/772 tests).
- [x] `npm -w client run test:run` passes (45/45 suites, 286/286 tests).
- [x] `npm -w server run build` & `npm -w client run build` succeed with exit code 0.
