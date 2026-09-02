# Task List: Hosted Multi-Tenant Vaultwarden Integration

## Phase 1: Infrastructure & Environment Configuration

### Task 1: Add Vaultwarden Service to `docker-compose.prod.yml` & `MSP_PORTAL_STACK.md`
**Description:** Add `msp_vaultwarden` container using `vaultwarden/server:alpine`, configured for subpath `/vault` with Traefik v3 routing labels, WebSocket hub support, and persistent volume `vaultwarden_data`. Update infrastructure documentation in `MSP_PORTAL_STACK.md`.

**Acceptance criteria:**
- [x] `vaultwarden` service defined in `docker-compose.prod.yml` with memory limit (120M) and CPU limit (0.20).
- [x] `DOMAIN=https://helpdesk.velmartech.com.do/vault` and `SIGNUPS_ALLOWED=false` configured.
- [x] Traefik router `msp-vault` correctly configured with `reverse-proxy` network, Let's Encrypt TLS, and load balancer port 80.
- [x] `MSP_PORTAL_STACK.md` updated with Vaultwarden service details and routing matrix.

**Verification:**
- [x] Inspect Compose file format and labels
- [x] Check `MSP_PORTAL_STACK.md` documentation parity

**Dependencies:** None
**Files likely touched:**
- `docker-compose.prod.yml`
- `docs/infrastructure/MSP_PORTAL_STACK.md`
**Estimated scope:** Small (2 files)

---

### Task 2: Extend Server Environment Schema with Vaultwarden Configuration
**Description:** Add `VAULTWARDEN_URL`, `VAULTWARDEN_ADMIN_TOKEN`, and `VAULTWARDEN_EXTERNAL_URL` to Zod schema in `server/src/shared/config/env.ts` with safe defaults for development and testing.

**Acceptance criteria:**
- [x] `VAULTWARDEN_URL` defaults to `http://vaultwarden:80`.
- [x] `VAULTWARDEN_ADMIN_TOKEN` defined as optional/defaulted string.
- [x] `VAULTWARDEN_EXTERNAL_URL` defaults to `https://helpdesk.velmartech.com.do/vault`.

**Verification:**
- [x] TypeScript check succeeds: `npm -w server run build`

**Dependencies:** None
**Files likely touched:**
- `server/src/shared/config/env.ts`
**Estimated scope:** XS (1 file)

---

## Checkpoint 1: Infrastructure & Environment
- [x] `docker-compose.prod.yml` updated with no syntax errors
- [x] `server/src/shared/config/env.ts` validated with clean TypeScript compile

---

## Phase 2: Core Domain Service & Lifecycle Integration

### Task 3: Implement `VaultwardenService` with Unit Tests
**Description:** Create `server/src/modules/system/services/VaultwardenService.ts` providing methods:
- `createOrganization(orgName: string, billingEmail: string)`
- `inviteUserToOrganization(orgId: string, email: string, role: 'User' | 'Manager' | 'Admin')`
- `deactivateOrganizationUsers(orgId: string)`
- `reactivateOrganizationUsers(orgId: string)`
- `deleteOrganization(orgId: string)` (for Day 30 purge)
Export from `server/src/modules/system/index.ts`. Co-locate `VaultwardenService.test.ts`.

**Acceptance criteria:**
- [x] Standard TSDoc annotations on all exported methods (`@param`, `@returns`, `@throws`).
- [x] Typed domain errors thrown using `@shared/errors`.
- [x] 100% Vitest unit test coverage for success, failure, and network edge cases.

**Verification:**
- [x] Tests pass: `npm -w server run test server/src/modules/system/services/VaultwardenService.test.ts`
- [x] Build succeeds: `npm -w server run build`

**Dependencies:** Task 2
**Files likely touched:**
- `server/src/modules/system/services/VaultwardenService.ts`
- `server/src/modules/system/services/VaultwardenService.test.ts`
- `server/src/modules/system/index.ts`
**Estimated scope:** Medium (3 files)

---

### Task 4: Integrate Organization Auto-Provisioning into `SubscriptionLifecycleService`
**Description:** Update `SubscriptionLifecycleService.ts` so that when a subscription is created or activated and its plan features include `PASSWORD_MANAGER`, it calls `vaultwardenService.createOrganization` and dispatches invitation emails to the tenant's primary users.

**Acceptance criteria:**
- [x] Detects `PASSWORD_MANAGER` feature code in plan definition.
- [x] Provisions organization named after client company / tenant.
- [x] Sends Bitwarden invite to the subscription owner's email address.
- [x] Fault-tolerant (logs failure without breaking subscription checkout).

**Verification:**
- [x] Tests pass: `npm -w server run test server/src/modules/subscriptions/services/SubscriptionLifecycleService.test.ts`
- [x] Build succeeds: `npm -w server run build`

**Dependencies:** Task 3
**Files likely touched:**
- `server/src/modules/subscriptions/services/SubscriptionLifecycleService.ts`
- `server/src/modules/subscriptions/services/SubscriptionLifecycleService.test.ts`
**Estimated scope:** Small (2 files)

---

### Task 5: Integrate Non-Payment Suspension & Purge Lifecycle (`BL-702`) into `NonPaymentSuspensionService`
**Description:** Update `NonPaymentSuspensionService.ts`:
- When applying `SUSPENDED` (Day 15), invoke `vaultwardenService.deactivateOrganizationUsers`.
- When applying `PURGED` (Day 30 in `purgeTenantData`), invoke `vaultwardenService.deleteOrganization`.
- When an overdue invoice is settled, re-activate organization users.

**Acceptance criteria:**
- [x] Day 15 deactivates Vaultwarden user accounts.
- [x] Day 30 cleanly purges tenant organization and data from Vaultwarden.
- [x] Co-located unit tests in `NonPaymentSuspensionService.test.ts` verify all lifecycle calls.

**Verification:**
- [x] Tests pass: `npm -w server run test server/src/modules/billing/services/NonPaymentSuspensionService.test.ts`
- [x] Build succeeds: `npm -w server run build`

**Dependencies:** Task 3
**Files likely touched:**
- `server/src/modules/billing/services/NonPaymentSuspensionService.ts`
- `server/src/modules/billing/services/NonPaymentSuspensionService.test.ts`
**Estimated scope:** Small-Medium (2 files)

---

## Checkpoint 2: Domain Services & Business Logic
- [x] All unit tests pass in `VaultwardenService.test.ts`
- [x] `SubscriptionLifecycleService.test.ts` passes with mocked Vaultwarden calls
- [x] `NonPaymentSuspensionService.test.ts` passes verifying suspension (deactivation) and purge (org deletion)
- [x] Backend compiles clean (`npm -w server run build`)

---

## Phase 3: Client Portal UX & Extension Guidance

### Task 6: Add Password Manager Client Navigation & Hub Page
**Description:** Add a "Password Manager" section to client navigation (under operations or security) visible when the client has an active subscription with `PASSWORD_MANAGER`. Create `PasswordManagerPage` with:
- One-click launch button to `/vault/`
- Status badge (Active / Provisioned)
- Quick links / guide to install Bitwarden Chrome, Edge, Firefox, iOS, and Android extensions
- Server URL copy helper (`https://helpdesk.velmartech.com.do/vault`)

**Acceptance criteria:**
- [x] Uses shadcn/ui components (`Button`, `Card`, `Badge`).
- [x] Compact heights (`h-7`) and design system compliance.
- [x] Responsive layout with copy-to-clipboard for the custom server URL.

**Verification:**
- [x] Visual verification of `PasswordManagerPage` in browser
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** None (can run in parallel with backend)
**Files likely touched:**
- `client/src/hooks/useSidebar.ts`
- `client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx`
- `client/src/routes/index.tsx`
**Estimated scope:** Medium (3 files)

---

### Task 7: Add i18n Localization Keys (`en_US.json` & `es_DO.json`)
**Description:** Provide full bilingual support for all new Password Manager navigation labels, cards, setup instructions, and status descriptions.

**Acceptance criteria:**
- [x] Zero hardcoded UI text.
- [x] Full parity between `en_US.json` and `es_DO.json`.

**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Client tests pass: `npm -w client run test:run`

**Dependencies:** Task 6
**Files likely touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`
**Estimated scope:** Small (2 files)

---

## Checkpoint 3: Final Verification & DoD
- [x] Clean compilation on both frontend and backend (`npm -w server run build` & `npm -w client run build`)
- [x] All relevant domain tests pass (`VaultwardenService.test.ts`, `NonPaymentSuspensionService.test.ts`, `SubscriptionService.test.ts`, `i18n.test.ts`, `app-sidebar.test.tsx`, `protected-routes.test.tsx`)
- [x] Zero lint/typecheck errors
