# Implementation Plan: Hosted Multi-Tenant Vaultwarden Integration

## Overview
Implement an end-to-end hosted, multi-tenant Vaultwarden password manager for MSP client tenants. This provisions a lightweight Vaultwarden service (`vaultwarden/server:alpine`) in `docker-compose.prod.yml` behind Traefik on subpath `/vault`, programmatically provisions Bitwarden Organizations and sends email invitations upon subscription activation (`PASSWORD_MANAGER` feature), and enforces account lifecycle state transitions per Dominican commercial terms (`BL-702` non-payment scale: Day 5 Read-Only, Day 15 Suspended, Day 30 Purged).

## Architecture Decisions
- **Container Topology & Routing:** Run one single `msp_vaultwarden` container in the existing Docker Compose stack attached to `default` and `reverse-proxy` networks. Traefik routes path prefix `/vault` to port 80, with `DOMAIN=https://helpdesk.velmartech.com.do/vault`.
- **Tenant Data Isolation:** Cryptographically zero-knowledge via Bitwarden Organizations and Collections. Each MSP client tenant maps to a dedicated Bitwarden Organization (`org_<tenant_id>`).
- **Domain Service Pattern:** Follow Clean Architecture: create `VaultwardenService` inside `server/src/modules/system/services/` (alongside `NextcloudService`), injected into `SubscriptionLifecycleService` and `NonPaymentSuspensionService`.
- **BL-702 Non-Payment Scale:**
  - Day 5 (`READ_ONLY`): Lock organization settings and block new user additions.
  - Day 15 (`SUSPENDED`): Deactivate users in the organization via Vaultwarden API to block access.
  - Day 30 (`PURGED`): Delete the tenant Organization and purge vault collections to liberate storage with zero liability.
  - Re-activation: Reactivate users upon settling invoice payment.
- **Client Portal UX:** Add Password Manager portal view / launch button linking to `/vault/#/login`, with extension setup instructions.

---

## Dependency Graph
```
docker-compose.prod.yml (Vaultwarden Service & Traefik router)
    │
    ▼
server/src/shared/config/env.ts (VAULTWARDEN_* env vars)
    │
    ▼
server/src/modules/system/services/VaultwardenService.ts (API wrapper: orgs, invites, status, purge)
    │
    ├──► SubscriptionLifecycleService.ts (On subscription activation: auto-provision Org & invite users)
    │
    └──► NonPaymentSuspensionService.ts (On Day 15 SUSPENDED / Day 30 PURGED: deactivate & delete)
    │
    ▼
client/src/ (Navigation link, Password Manager dashboard view & extension onboarding)
```

---

## Task List

### Phase 1: Infrastructure & Environment Configuration
- [x] **Task 1: Add Vaultwarden Service to `docker-compose.prod.yml` & `MSP_PORTAL_STACK.md`**
- [x] **Task 2: Extend Server Environment Schema with Vaultwarden Configuration**

### Checkpoint 1: Infrastructure & Configuration Verification
- [x] Verify `docker-compose.prod.yml` syntax and Traefik routing rules
- [x] Server environment validation schema passes tests without regressions

### Phase 2: Core Domain Service & Lifecycle Integration
- [x] **Task 3: Implement `VaultwardenService` with Unit Tests**
- [x] **Task 4: Integrate Organization Auto-Provisioning into `SubscriptionLifecycleService`**
- [x] **Task 5: Integrate Non-Payment Suspension & Purge Lifecycle (`BL-702`) into `NonPaymentSuspensionService`**

### Checkpoint 2: Backend Services & Business Logic Verification
- [x] Vitest unit tests pass for `VaultwardenService.test.ts`
- [x] `SubscriptionLifecycleService.test.ts` passes with mocked Vaultwarden calls
- [x] `NonPaymentSuspensionService.test.ts` passes verifying suspension (deactivation) and purge (org deletion)
- [x] Backend compiles clean (`npm -w server run build`)

### Phase 3: Client Portal UX & Extension Guidance
- [x] **Task 6: Add Password Manager Client Navigation & Hub Page**
- [x] **Task 7: Add i18n Localization Keys (`en_US.json` & `es_DO.json`)**

### Checkpoint 3: Complete Definition of Done
- [x] Clean compilation on both frontend and backend (`npm -w server run build` & `npm -w client run build`)
- [x] All frontend and backend tests pass (`npm -w server run test` & `npm -w client run test:run`)
- [x] Zero lint/typecheck errors

---

## Detailed Task Breakdown

### Task 1: Add Vaultwarden Service to `docker-compose.prod.yml` & `MSP_PORTAL_STACK.md`
**Description:** Add `msp_vaultwarden` container using `vaultwarden/server:alpine`, configured for subpath `/vault` with Traefik v3 routing labels, WebSocket hub support, and persistent volume `vaultwarden_data`. Update infrastructure documentation in `MSP_PORTAL_STACK.md`.

**Acceptance criteria:**
- [ ] `vaultwarden` service defined in `docker-compose.prod.yml` with memory limit (120M) and CPU limit (0.20).
- [ ] `DOMAIN=https://helpdesk.velmartech.com.do/vault` and `SIGNUPS_ALLOWED=false` configured.
- [ ] Traefik router `msp-vault` correctly configured with `reverse-proxy` network, Let's Encrypt TLS, and load balancer port 80.
- [ ] `MSP_PORTAL_STACK.md` updated with Vaultwarden service details and routing matrix.

**Files likely touched:**
- `docker-compose.prod.yml`
- `docs/infrastructure/MSP_PORTAL_STACK.md`
**Estimated scope:** Small (2 files)

---

### Task 2: Extend Server Environment Schema with Vaultwarden Configuration
**Description:** Add `VAULTWARDEN_URL`, `VAULTWARDEN_ADMIN_TOKEN`, and `VAULTWARDEN_EXTERNAL_URL` to Zod schema in `server/src/shared/config/env.ts` with safe defaults for development and testing.

**Acceptance criteria:**
- [ ] `VAULTWARDEN_URL` defaults to `http://vaultwarden:80` (or `http://localhost:8080/vault`).
- [ ] `VAULTWARDEN_ADMIN_TOKEN` defined as optional/defaulted string.
- [ ] `VAULTWARDEN_EXTERNAL_URL` defaults to `https://helpdesk.velmartech.com.do/vault`.

**Files likely touched:**
- `server/src/shared/config/env.ts`
**Estimated scope:** XS (1 file)

---

### Task 3: Implement `VaultwardenService` with Unit Tests
**Description:** Create `server/src/modules/system/services/VaultwardenService.ts` providing methods:
- `createOrganization(orgName: string, billingEmail: string)`
- `inviteUserToOrganization(orgId: string, email: string, role: 'User' | 'Manager' | 'Admin')`
- `setOrganizationStatus(orgId: string, active: boolean)` (for Day 15 suspension)
- `deactivateOrganizationUsers(orgId: string)`
- `reactivateOrganizationUsers(orgId: string)`
- `deleteOrganization(orgId: string)` (for Day 30 purge)
Export from `server/src/modules/system/index.ts`. Co-locate `VaultwardenService.test.ts`.

**Acceptance criteria:**
- [ ] Typed domain errors thrown using `@shared/errors` (`ExternalServiceError`, `InternalServerError`).
- [ ] Standard TSDoc annotations on all exported methods (`@param`, `@returns`, `@throws`).
- [ ] 100% Vitest unit test coverage for success, failure, and network edge cases.

**Files likely touched:**
- `server/src/modules/system/services/VaultwardenService.ts`
- `server/src/modules/system/services/VaultwardenService.test.ts`
- `server/src/modules/system/index.ts`
**Estimated scope:** Medium (3 files)

---

### Task 4: Integrate Organization Auto-Provisioning into `SubscriptionLifecycleService`
**Description:** Update `SubscriptionLifecycleService.ts` so that when a subscription is created or activated and its plan features include `PASSWORD_MANAGER`, it calls `vaultwardenService.createOrganization` and dispatches invitation emails to the tenant's primary users.

**Acceptance criteria:**
- [ ] Detects `PASSWORD_MANAGER` feature code in plan definition.
- [ ] Provisions organization named after client company / tenant.
- [ ] Sends Bitwarden invite to the subscription owner's email address.
- [ ] Logs error without blocking checkout if external service is temporarily unreachable (fault-tolerant).

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
- [ ] Day 15 deactivates Vaultwarden user accounts.
- [ ] Day 30 cleanly purges tenant organization and data from Vaultwarden.
- [ ] Co-located unit tests in `NonPaymentSuspensionService.test.ts` verify all lifecycle calls.

**Files likely touched:**
- `server/src/modules/billing/services/NonPaymentSuspensionService.ts`
- `server/src/modules/billing/services/NonPaymentSuspensionService.test.ts`
**Estimated scope:** Small-Medium (2 files)

---

### Task 6: Add Password Manager Client Navigation & Hub Page
**Description:** Add a "Password Manager" section to client navigation (under operations or security) visible when the client has an active subscription with `PASSWORD_MANAGER`. Create `PasswordManagerPage` with:
- One-click launch button to `/vault/`
- Status badge (Active / Provisioned)
- Quick links / guide to install Bitwarden Chrome, Edge, Firefox, iOS, and Android extensions
- Server URL copy helper (`https://helpdesk.velmartech.com.do/vault`)

**Acceptance criteria:**
- [ ] Uses shadcn/ui components (`Button`, `Card`, `Badge`).
- [ ] Compact heights (`h-7`) and design system compliance.
- [ ] Responsive layout with copy-to-clipboard for the custom server URL.

**Files likely touched:**
- `client/src/hooks/useSidebar.ts`
- `client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx`
- `client/src/routes/index.tsx`
**Estimated scope:** Medium (3 files)

---

### Task 7: Add i18n Localization Keys (`en_US.json` & `es_DO.json`)
**Description:** Provide full bilingual support for all new Password Manager navigation labels, cards, setup instructions, and status descriptions.

**Acceptance criteria:**
- [ ] Zero hardcoded UI text.
- [ ] Full parity between `en_US.json` and `es_DO.json`.

**Files likely touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`
**Estimated scope:** Small (2 files)

---

## Verification Plan

### Automated Tests
- Backend tests: `npm -w server run test`
- Frontend tests: `npm -w client run test:run`
- Build check: `npm -w server run build` and `npm -w client run build`

### Manual Verification
- Verify `docker-compose.prod.yml` syntax using `docker compose config`
- Verify navigation item and Password Manager hub page in local development environment
- Verify invitation trigger and suspension lifecycle mocks in Vitest
