# Implementation Plan: Vaultwarden Self-Service Password Reset & Re-Invite

## Overview
Implement an automated, self-service password reset and organization re-invitation workflow for the hosted Vaultwarden password manager. In accordance with zero-knowledge cryptographic principles, forgotten Master Passwords cannot be recovered. This feature allows authenticated team members locked out of their personal vaults to securely de-provision their orphaned vault record and instantly receive a fresh Bitwarden invitation email to create a new Master Password and reconnect with their tenant organization collections.

## Architecture Decisions
- **Zero-Knowledge Realignment:** We do not attempt to escrow or recover Master Passwords. Instead, the backend purges the orphaned user via the Vaultwarden Admin API (`/api/admin/users/{userId}/delete`) and triggers an automated re-invitation (`/api/organizations/{orgId}/users/invite`).
- **Identity & Tenant Anchoring:** The reset operation is strictly scoped to the authenticated user's verified session (`req.user.email` and `req.user.tenant_id`). Users cannot reset or de-provision credentials belonging to other members or tenants.
- **Data Loss Safeguards:** The frontend enforces a double-confirmation modal (`AlertDialog`) that explicitly informs the user that personal, unshared vault credentials will be wiped, while all shared organizational collections remain safe and intact.
- **Abuse Prevention:** Protected by a strict rate limiter (maximum 3 reset attempts per hour per user).

---

## Dependency Graph
```
Vaultwarden Admin & Org API (User delete & org re-invite)
    │
    ▼
server/src/modules/system/services/VaultwardenService.ts (resetUserVaultAccess method)
    │
    ▼
server/src/modules/system/controllers/SystemController.ts (resetVaultAccess handler)
    │
    ▼
server/src/modules/system/routes/system.routes.ts (POST /api/v1/system/vault/reset-user-access)
    │
    ▼
client/src/services/systemService.ts (resetVaultAccess API client call)
    │
    ▼
client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx (UI reset card, AlertDialog confirmation)
    │
    ▼
client/src/locales/{en_US,es_DO}.json (Localization strings)
```

---

## Task List

### Phase 1: Backend Domain Service & Endpoint
- [ ] **Task 1: Extend `VaultwardenService` with `resetUserVaultAccess` and Unit Tests**
- [ ] **Task 2: Add `POST /api/v1/system/vault/reset-user-access` Route with Rate Limiting & Controller Handler**

### Checkpoint 1: Backend Verification
- [ ] `VaultwardenService.test.ts` passes all test cases including mock mode, user lookup, deletion, and re-invitation
- [ ] Route and controller tests pass with 200 OK and 429 rate limit checks
- [ ] Server compiles clean (`npm -w server run build`)

### Phase 2: Frontend Client Service, Modal UI & Localization
- [ ] **Task 3: Add `resetVaultAccess` method to Frontend `systemService`**
- [ ] **Task 4: Add "Trouble Logging In?" Card and `AlertDialog` Confirmation to `PasswordManagerPage`**
- [ ] **Task 5: Add English (`en_US.json`) and Spanish (`es_DO.json`) Translations**

### Checkpoint 2: Frontend & End-to-End Verification
- [ ] Frontend builds cleanly with zero TypeScript errors (`npm -w client run build`)
- [ ] Frontend tests pass (`npm -w client run test:run`)
- [ ] Double-confirmation dialog properly prevents accidental execution
- [ ] Toast notification appears with clear user instructions upon successful email dispatch

---

## Detailed Task Breakdown

### Task 1: Extend `VaultwardenService` with `resetUserVaultAccess` and Unit Tests
**Description:** Add method `resetUserVaultAccess(tenantId: string, userEmail: string): Promise<{ success: boolean; message: string }>` to `VaultwardenService.ts`. In live mode, it lists users via `/api/admin/users`, deletes the matching user by email via `/api/admin/users/{id}/delete`, resolves the tenant organization, and calls `inviteUserToOrganization`. In mock mode, it returns simulated success. Co-locate comprehensive unit tests.

**Acceptance criteria:**
- [ ] Throws domain error `NotFoundError` if the user is not found or organization cannot be resolved.
- [ ] Calls Vaultwarden Admin API to delete stale user account.
- [ ] Re-invites user with role `'User'` into the tenant's Bitwarden organization.
- [ ] 100% unit test coverage in `VaultwardenService.test.ts`.

**Verification:**
- Focused test: `npm -w server run test -- src/modules/system/services/VaultwardenService.test.ts`

**Dependencies:** None
**Files likely touched:**
- `server/src/modules/system/services/VaultwardenService.ts`
- `server/src/modules/system/services/VaultwardenService.test.ts`
**Estimated scope:** S (2 files)

---

### Task 2: Add `POST /api/v1/system/vault/reset-user-access` Route with Rate Limiting & Controller Handler
**Description:** Implement `resetVaultAccess` method in `SystemController` and register route `POST /api/v1/system/vault/reset-user-access` in `system.routes.ts`. Enforce JWT authentication and strict sliding-window rate limiting (3 requests / 60 min).

**Acceptance criteria:**
- [ ] Protected by `authenticate` middleware; extracts verified `user.email` and `user.tenant_id`.
- [ ] Calls `vaultwardenService.resetUserVaultAccess(tenant_id, email)`.
- [ ] Returns HTTP 200 with `{ success: true, message: '...' }`.
- [ ] Throws `RateLimitError` when request threshold is exceeded.

**Verification:**
- Focused test: `npm -w server run test -- src/modules/system/controllers/SystemController.test.ts`
- Server build: `npm -w server run build`

**Dependencies:** Task 1
**Files likely touched:**
- `server/src/modules/system/controllers/SystemController.ts`
- `server/src/modules/system/routes/system.routes.ts`
**Estimated scope:** S (2 files)

---

### Task 3: Add `resetVaultAccess` Method to Frontend `systemService`
**Description:** Extend `client/src/services/systemService.ts` (or equivalent API client module) with `resetVaultAccess(): Promise<{ success: boolean; message: string }>`.

**Acceptance criteria:**
- [ ] Sends authenticated `POST` request to `/api/v1/system/vault/reset-user-access`.
- [ ] Handles errors cleanly and throws formatted error messages.

**Verification:**
- TypeScript check: `npm -w client run build`

**Dependencies:** Task 2
**Files likely touched:**
- `client/src/services/systemService.ts`
**Estimated scope:** XS (1 file)

---

### Task 4: Add "Trouble Logging In?" Card and `AlertDialog` Confirmation to `PasswordManagerPage`
**Description:** Update `client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx` to include an accessible, high-visibility card:
1. Explains the zero-knowledge security model and why Master Passwords cannot be decrypted by admins.
2. Provides a **"Reset Vault Access"** button triggering an `AlertDialog`.
3. Modal displays critical warning: personal unshared passwords will be lost, but company collections remain intact.
4. Shows loading state and triggers toast notification upon completion.

**Acceptance criteria:**
- [ ] Clear educational distinction between MSP Portal password and Bitwarden Master Password.
- [ ] `AlertDialog` prevents accidental clicks with double-confirmation.
- [ ] Compact design standard (`h-7` button height).
- [ ] Toast notification informs user to check their email inbox.

**Verification:**
- Frontend build: `npm -w client run build`
- Manual visual inspection on `http://localhost:5173/password-manager`

**Dependencies:** Task 3
**Files likely touched:**
- `client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx`
**Estimated scope:** S (1 file)

---

### Task 5: Add English (`en_US.json`) and Spanish (`es_DO.json`) Translations
**Description:** Add all new localization strings across `en_US.json` and `es_DO.json` for all modal titles, warnings, button labels, and toasts under the `passwordManager.*` namespace.

**Acceptance criteria:**
- [ ] Zero hardcoded UI strings.
- [ ] 100% key parity between `en_US.json` and `es_DO.json`.

**Verification:**
- i18n parity check: verify keys exist in both locale files.

**Dependencies:** Task 4
**Files likely touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`
**Estimated scope:** S (2 files)

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| User resets vault accidentally and loses unshared personal passwords | High | Require double-confirmation modal with explicit warning before dispatching request |
| Malicious user resets another team member's vault | Critical | Strictly tie API request to the authenticated user's verified session email and tenant ID (`req.user.email`) |
| Repeated reset requests trigger email spam | Medium | Apply sliding-window rate limit (3 requests per hour per user) on the endpoint |
