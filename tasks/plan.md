# Implementation Plan: Systematic Horizontal Migration — Slice 1: Equipment & Subscriptions

## Overview
Migrate the `equipment` (device slots, OTP pairing, Nextcloud credentials, admin inventory) and `subscriptions` (plans, feature entitlements, PayPal checkout orders) domains to the **Contract-First Monolith** architecture:
1. Canonical Zod schemas and TypeScript types in `@shared/contracts`.
2. Direct Express route validation using `@shared/contracts`.
3. Type-safe TanStack Query hooks in `client/src/hooks/queries/` with automated cache invalidation.
4. Refactor `DevicesPage` and `PlansPage` to eliminate manual `useState`/`useEffect` loading boilerplate.

---

## Architecture Decisions & Constraints
- **Canonical Contracts in `@shared/contracts`:** All request inputs, query filters, and entity payloads for equipment and subscriptions live in `packages/contracts/src/equipment/` and `packages/contracts/src/subscriptions/`.
- **Backward Compatibility:** `server/src/shared/dtos/equipment.dto.ts` and `subscription.dto.ts` will re-export from `@shared/contracts` to prevent breaking existing controller references.
- **Server State Delegation:** `client/src/hooks/queries/useEquipment.ts` and `useSubscriptions.ts` will handle all asynchronous fetching, caching, and cache invalidation. Zustand stores remain strictly for client UI state.
- **Zero Regressions:** Existing server and client unit test suites must remain green with zero regressions.

---

## Task Breakdown

### Phase 1: Shared Contracts Foundation (`packages/contracts`)
- **Task 8:** Define Equipment API Contracts & Zod Schemas (`packages/contracts/src/equipment/`)
- **Task 9:** Define Subscription & Plan API Contracts & Zod Schemas (`packages/contracts/src/subscriptions/`)
- **Checkpoint 1:** Contracts package builds cleanly (`npm run build:packages`) and tests pass (`npm -w packages/contracts run test`).

### Phase 2: Server Route Validation Integration (`server`)
- **Task 10:** Wire `@shared/contracts` validation on Equipment and Subscription Express routes.
- **Checkpoint 2:** Server compiles cleanly (`npm -w server run build`) and all equipment/subscription backend tests pass (`npx vitest run src/modules/equipment/ src/modules/subscriptions/`).

### Phase 3: Client Query Hooks & Page Refactoring (`client`)
- **Task 11:** Implement `useEquipment` and `useSubscriptions` TanStack Query hooks.
- **Task 12:** Refactor `DevicesPage` and `PlansPage` to consume query hooks with automatic cache invalidation.
- **Checkpoint 3:** Client compiles cleanly (`npm -w client run build`) and isolated client tests pass (`npx vitest run src/pages/DevicesPage/DevicesPage.test.tsx src/pages/PlansPage/PlansPage.test.tsx`).

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **Complex Equipment Model:** `SubscriptionEquipment` contains 30+ optional telemetry fields. | High | Define strict core fields in Zod and make telemetry metrics optional nullable fields, fully reflecting database schema and agent capabilities. |
| **PayPal Order Flow:** Paypal checkout requires redirect/approval URLs. | Medium | Contract specifies explicit response schemas for `{ orderId }` and `{ subscriptionId, approveUrl }`. |
| **Test Timing in Heavy Client Suite:** Vitest tests can timeout on Windows when running 40 suites simultaneously. | Low | Run targeted test commands for touched suites (`DevicesPage.test.tsx`, `useEquipment.test.tsx`) as established in DoD. |
