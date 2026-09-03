# Task List: Vaultwarden Self-Service Password Reset & Re-Invite

## Phase 1: Backend Domain Service & Endpoint

### Task 1: Extend `VaultwardenService` with `resetUserVaultAccess` and Unit Tests
**Description:** Add method `resetUserVaultAccess(tenantId: string, userEmail: string): Promise<{ success: boolean; message: string }>` to `VaultwardenService.ts`. In live mode, it queries users via `/api/admin/users`, deletes the matching user account via `/api/admin/users/{id}/delete`, resolves the tenant organization, and calls `inviteUserToOrganization`. In mock/dev mode, it returns simulated success.
**Acceptance criteria:**
- [x] Throws domain error `NotFoundError` if user or organization not found.
- [x] Purges stale user account from Vaultwarden.
- [x] Re-invites user with role `'User'` into the tenant's Bitwarden organization.
- [x] 100% unit test coverage in `VaultwardenService.test.ts`.

**Verification:**
- [x] Unit tests pass: `npm -w server run test -- src/modules/system/services/VaultwardenService.test.ts`
- [x] Server builds: `npm -w server run build`

**Dependencies:** None
**Files touched:**
- `server/src/modules/system/services/VaultwardenService.ts`
- `server/src/modules/system/services/VaultwardenService.test.ts`

---

### Task 2: Add `POST /api/v1/system/vault/reset-user-access` Route with Rate Limiting & Controller Handler
**Description:** Implement `resetVaultAccess` in `SystemController.ts` and register route `POST /api/v1/system/vault/reset-user-access` in `system.routes.ts`. Enforce JWT authentication and sliding-window rate limiting.
**Acceptance criteria:**
- [x] Protected by `authenticate` middleware; extracts verified `user.email` and `user.tenant_id`.
- [x] Calls `vaultwardenService.resetUserVaultAccess(tenant_id, email)`.
- [x] Returns HTTP 200 with `{ success: true, message: '...' }`.
- [x] Throws `RateLimitError` when threshold exceeded.

**Verification:**
- [x] Server tests pass: `npm -w server run test -- src/modules/system/`
- [x] Server builds: `npm -w server run build`

**Dependencies:** Task 1
**Files touched:**
- `server/src/modules/system/controllers/SystemController.ts`
- `server/src/modules/system/controllers/SystemController.test.ts`
- `server/src/modules/system/routes/system.routes.ts`

---

## Checkpoint 1: Backend Verification
- [x] All `VaultwardenService` tests pass
- [x] Controller and route handlers compile and pass tests
- [x] Server builds cleanly with zero TypeScript errors (`npm -w server run build`)

---

## Phase 2: Frontend Client Service, Modal UI & Localization

### Task 3: Add `resetVaultAccess` Method to Frontend `systemService`
**Description:** Extend `client/src/services/systemService.ts` with `resetVaultAccess(): Promise<{ success: boolean; message: string }>`.
**Acceptance criteria:**
- [x] Sends authenticated `POST` request to `/api/v1/system/vault/reset-user-access`.
- [x] Handles errors cleanly and returns parsed API payload.

**Verification:**
- [x] Frontend builds cleanly: `npm -w client run build`

**Dependencies:** Task 2
**Files touched:**
- `client/src/services/systemService.ts`

---

### Task 4: Add "Trouble Logging In?" Card and `AlertDialog` Confirmation to `PasswordManagerPage`
**Description:** Update `client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx` to include an accessible card explaining the zero-knowledge security model and a **"Reset Vault Access"** button triggering an `AlertDialog` double-confirmation.
**Acceptance criteria:**
- [x] Clear educational distinction between MSP Portal password and Bitwarden Master Password.
- [x] `AlertDialog` prevents accidental clicks with double-confirmation warning.
- [x] Standard compact button styling (`h-7`).
- [x] Toast notification informs user to check their email inbox upon completion.

**Verification:**
- [x] Frontend tests pass: `npm -w client run test:run -- src/pages/PasswordManagerPage/PasswordManagerPage.test.tsx`
- [x] Frontend builds: `npm -w client run build`

**Dependencies:** Task 3
**Files touched:**
- `client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx`
- `client/src/pages/PasswordManagerPage/PasswordManagerPage.test.tsx`

---

### Task 5: Add English (`en_US.json`) and Spanish (`es_DO.json`) Translations
**Description:** Add all new localization strings across `en_US.json` and `es_DO.json` for all modal titles, warnings, button labels, and toasts under the `passwordManager.*` namespace.
**Acceptance criteria:**
- [x] Zero hardcoded UI strings.
- [x] 100% key parity between `en_US.json` and `es_DO.json`.

**Verification:**
- [x] Key parity and locale tests pass.

**Dependencies:** Task 4
**Files touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`

---

## Checkpoint 2: Complete Definition of Done
- [x] Full backend test suite passes: `npm -w server run test` (72 files, 710 tests)
- [x] Frontend unit tests pass: `npm -w client run test:run`
- [x] Clean compilation on both frontend and backend (`npm -w server run build` & `npm -w client run build`)
- [x] Zero lint/typecheck errors
