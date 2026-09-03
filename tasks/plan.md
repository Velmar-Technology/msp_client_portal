# Implementation Plan: BL-702 Graceful Password Vault Non-Payment Handling

## Overview
Implement progressive, non-adversarial enforcement for password manager services under the canonical 4-tier non-payment scale (`BL-702`).
Prevents operational paralysis and the "Hostage Catch-22" by maintaining credential retrieval and workstation autofill in Read-Only mode on Day 5, offering an emergency 24-hour self-service grace extension on Day 15, and securely dispatching a password-encrypted export archive to the verified Client Admin prior to permanent technical deletion on Day 30.

---

## Architecture Decisions

1. **Vault Frozen in Time (Day 5 READ_ONLY):**
   - Collections in Vaultwarden set to `readOnly: true`.
   - Existing credentials remain readable and autofillable; creation of new credentials, member invitations, and secret modifications are rejected.
2. **Captive Gateway & Emergency 24h Grace Extension (Day 15 SUSPENDED):**
   - Web Vault access is intercepted by a billing paywall modal.
   - Client Admins can activate a 1-time "Emergency 24-Hour Grace Extension" in `/billing` to unblock access while payments or wire transfers clear.
   - `tenants.vault_grace_extension_until` and `vault_grace_extensions_count` enforce anti-abuse limits (max 1 self-service extension per overdue cycle).
3. **Encrypted Escrow Archive Before Deletion (Day 30 PURGED):**
   - Automatically generates a password-encrypted JSON export of the tenant's Vaultwarden organization.
   - Sends the encrypted backup directly to the Client Admin's verified email address.
   - Deletes live organization collections from the Vaultwarden instance, satisfying storage liberation with zero liability.
4. **Automated Account Restoration:**
   - When overdue invoices are marked `PAID` or captured via PayPal, `NonPaymentSuspensionService.restoreAccountIfPaid` unlocks Vaultwarden collections (`setOrganizationReadOnly(tenantId, false)`), resets grace counters, and restores live access.

---

## Dependency Graph

```
Phase 1: Database Schema & Contracts
   ├── 1.1 Add tenant vault grace columns (migration 041)
   ├── 1.2 Update Drizzle tenant schema & shared types
   ├── 1.3 Add RequestVaultGrace contracts in @shared/contracts
   └── Checkpoint 1: Database schema & contracts compile clean
          │
          ▼
Phase 2: Backend Vaultwarden & Non-Payment Scale Services
   ├── 2.1 VaultwardenService read-only toggle & encrypted export methods
   ├── 2.2 NonPaymentSuspensionService Day 5, Day 15 grace & Day 30 export
   ├── 2.3 NonPaymentSuspensionService restoration loop
   ├── 2.4 Billing controller & POST /api/v1/billing/request-vault-grace
   └── Checkpoint 2: Backend unit tests green (NonPayment + Vaultwarden)
          │
          ▼
Phase 3: Frontend Client Portal Integration
   ├── 3.1 TanStack Query hook useRequestVaultGrace in features/billing
   ├── 3.2 Emergency Grace & Non-Payment Alert Card in BillingPage
   ├── 3.3 Vault Read-Only notice banner in PasswordManagerPage
   ├── 3.4 Bilingual localization in en_US.json and es_DO.json
   └── Checkpoint 3: Frontend build passes & UI renders cleanly
          │
          ▼
Phase 4: Verification & Quality Gates
   ├── 4.1 Vitest unit tests for backend and frontend
   ├── 4.2 Monorepo typecheck & build gate (npm run build)
   └── Checkpoint 4: Definition of Done verified
```

---

## Phase Breakdown

### Phase 1: Database Schema & Contracts
- **Task 1.1:** Create SQL migration `041_add_tenant_vault_grace_columns.sql` adding `vault_grace_extension_until` and `vault_grace_extensions_count` to `tenants`.
- **Task 1.2:** Update `server/src/shared/db/schema.ts` and `server/src/shared/types/index.ts`.
- **Task 1.3:** Define Zod contracts in `packages/contracts/src/billing/` for requesting vault grace. Rebuild `@shared/contracts`.

### Phase 2: Backend Vaultwarden & Non-Payment Scale Services
- **Task 2.1:** Enhance `VaultwardenService` with `setOrganizationReadOnly(orgId: string, readOnly: boolean)` and `exportOrganizationEncrypted(orgId: string)`.
- **Task 2.2:** Update `NonPaymentSuspensionService.evaluateOverdueAccounts` to enforce Day 5 read-only, check Day 15 grace extension bypass, and execute Day 30 export-before-purge.
- **Task 2.3:** Update `restoreAccountIfPaid` to re-enable write access on Vaultwarden and reset grace counters.
- **Task 2.4:** Add `POST /api/v1/billing/request-vault-grace` endpoint in `billing.routes.ts` and `BillingController`.

### Phase 3: Frontend Client Portal Integration
- **Task 3.1:** Implement `useRequestVaultGrace` mutation hook in `client/src/features/billing/api/`.
- **Task 3.2:** Implement Non-Payment Status Card & "Request 24h Emergency Access" button in `BillingPage.tsx`.
- **Task 3.3:** Add Read-Only warning banner in `PasswordManagerPage.tsx`.
- **Task 3.4:** Add i18n translation strings across `en_US.json` and `es_DO.json`.

### Phase 4: Verification & Quality Gates
- **Task 4.1:** Write unit tests in `NonPaymentSuspensionService.test.ts` and `VaultwardenService.test.ts`.
- **Task 4.2:** Run full workspace quality gates (`build:packages`, `server build`, `client build`, test suites).
