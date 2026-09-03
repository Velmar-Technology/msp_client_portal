# Implementation Tasks: Slice 1 — Equipment & Subscriptions Migration

## Phase 1: Shared Contract Foundation (`packages/contracts`)

### Task 8: Define Equipment API Contracts & Zod Schemas
**Description:** Define the shared Zod contracts for equipment and device slot management in `@shared/contracts/src/equipment/`. Define schemas for activating via OTP, slot parameter validation, admin device creation, and the canonical `SubscriptionEquipmentResponseSchema`.
**Acceptance criteria:**
- [x] `ActivateWithOtpInputSchema` validates 6-digit numeric OTP, UUID `subscriptionId`, integer `slotIndex`, and optional device metadata.
- [x] `SlotParamsSchema` validates UUID `subId` and coerced integer `slotIndex`.
- [x] `AddAdminDeviceInputSchema` validates admin-managed hardware registration.
- [x] `SubscriptionEquipmentSchema` validates full equipment entities with optional RMM agent telemetry metrics.
- [x] Unit tests pass in `packages/contracts/src/equipment/equipment.contract.test.ts`.
**Verification:**
- [x] `npm -w packages/contracts run test`
- [x] `npm run build:packages`
**Dependencies:** None  
**Files touched:**
- `packages/contracts/src/equipment/equipment.contract.ts`
- `packages/contracts/src/equipment/equipment.contract.test.ts`
- `packages/contracts/src/index.ts`
**Estimated scope:** Small (3 files)

---

### Task 9: Define Subscription & Plan API Contracts & Zod Schemas
**Description:** Define the shared Zod contracts for subscription lifecycle and pricing plans in `@shared/contracts/src/subscriptions/`. Define schemas for subscription creation, PayPal orders, plan CRUD, and plan queries.
**Acceptance criteria:**
- [x] `CreateSubscriptionInputSchema` validates service name, plan tier, equipment count, and optional billing cycle/PayPal fields.
- [x] `CreatePaypalOrderInputSchema` validates plan, equipment count, billing cycle, and optional current subscription ID.
- [x] `UpdateSubscriptionInputSchema` validates plan upgrades, equipment count adjustments, and status changes.
- [x] `CreatePlanInputSchema` and `PlanQuerySchema` validate plan creation and role-based filtering.
- [x] Unit tests pass in `packages/contracts/src/subscriptions/subscriptions.contract.test.ts`.
**Verification:**
- [x] `npm -w packages/contracts run test`
- [x] `npm run build:packages`
**Dependencies:** Task 8  
**Files touched:**
- `packages/contracts/src/subscriptions/subscriptions.contract.ts`
- `packages/contracts/src/subscriptions/subscriptions.contract.test.ts`
- `packages/contracts/src/index.ts`
**Estimated scope:** Small (3 files)

---

## Checkpoint: Contracts Foundation
- [x] `@shared/contracts` builds cleanly with dual ESM/CJS outputs (`npm run build:packages`).
- [x] All contract unit tests pass (`npm -w packages/contracts run test`).

---

## Phase 2: Server Route Validation Integration (`server`)

### Task 10: Wire `@shared/contracts` on Equipment & Subscription Routes
**Description:** Refactor server DTO files (`server/src/shared/dtos/equipment.dto.ts` and `subscription.dto.ts`) to re-export schemas directly from `@shared/contracts`. Ensure Express routes validate payloads using the shared contracts.
**Acceptance criteria:**
- [x] `equipment.routes.ts` validates `activate-with-otp` and `admin/devices` with contracts.
- [x] `subscription.routes.ts` validates `paypal-order`, `paypal-subscription`, and `create` with contracts.
- [x] `plan.routes.ts` validates plan query, creation, and updates with contracts.
- [x] Zero breaking changes to existing controller logic.
**Verification:**
- [x] `npx vitest run src/modules/equipment/ src/modules/subscriptions/` passes completely (143 tests).
- [x] Server DTOs point directly to `@shared/contracts`.
**Dependencies:** Tasks 8-9  
**Files touched:**
- `server/src/shared/dtos/equipment.dto.ts`
- `server/src/shared/dtos/subscription.dto.ts`
- `server/src/shared/dtos/plan.dto.ts`
- `server/tsconfig.json`
**Estimated scope:** Medium (4-5 files)

---

## Checkpoint: Server Validation
- [x] Server DTO re-exports compile cleanly with zero type errors.
- [x] All equipment and subscription module tests pass (143 tests green).

---

## Phase 3: Client Query Hooks & Page Refactoring (`client`)

### Task 11: Implement TanStack Query Hooks for Equipment & Subscriptions
**Description:** Create typed custom hooks in `client/src/hooks/queries/useEquipment.ts` and `useSubscriptions.ts` that encapsulate data fetching, query caching, and automated cache invalidation.
**Acceptance criteria:**
- [x] `useMyDevices()` and `useAdminDevices()` fetch equipment inventory with standardized query keys.
- [x] `useActivateWithOtp()` mutation invalidates device slot queries on successful OTP pairing.
- [x] `useSubscriptions()` and `usePlans(query)` fetch subscription and plan data.
- [x] `useCreateSubscription()` and `useCreatePaypalOrder()` mutations trigger cache invalidation.
- [x] Unit tests pass in `client/src/hooks/queries/useEquipment.test.tsx` and `useSubscriptions.test.tsx`.
**Verification:**
- [x] `npx vitest run src/hooks/queries/` passes (9 tests).
- [x] `npm -w client run build` succeeds with zero errors.
**Dependencies:** Task 10  
**Files touched:**
- `client/src/hooks/queries/useEquipment.ts`
- `client/src/hooks/queries/useEquipment.test.tsx`
- `client/src/hooks/queries/useSubscriptions.ts`
- `client/src/hooks/queries/useSubscriptions.test.tsx`
**Estimated scope:** Medium (4 files)

---

### Task 12: Refactor `DevicesPage` and `PlansPage` Views
**Description:** Refactor `DevicesPage` and `PlansPage` to consume `useEquipment` and `useSubscriptions` hooks, replacing manual `useState`/`useEffect` loading and error tracking.
**Acceptance criteria:**
- [x] `DevicesPage` uses `useMyDevices` and `useActivateWithOtp` mutation via `useDeviceQueries` with canonical `EQUIPMENT_QUERY_KEYS`.
- [x] `PlansPage` uses `useSubscriptions` and `usePlans`.
- [x] Replaced duplicate `SubscriptionEquipment` interface in `equipmentService.ts` with contract import from `@shared/contracts`.
**Verification:**
- [x] `npx vitest run src/pages/DevicesPage/DevicesPage.test.tsx src/pages/PlansPage/PlansPage.test.tsx` passes (27 tests).
- [x] `npm -w client run build` compiles with zero TypeScript errors.
**Dependencies:** Task 11  
**Files touched:**
- `client/src/hooks/devices/useDeviceQueries.ts`
- `client/src/services/equipmentService.ts`
- `client/src/services/ticketService.ts`
- `client/src/hooks/useTicketsPage.ts`
**Estimated scope:** Medium (4 files)

---

## Checkpoint: Slice 1 Complete
- [x] Packages and client compile cleanly (`npm run build:packages`, `npm -w client run build`).
- [x] Equipment and Subscription test suites pass with zero regressions (143 server tests + 27 client tests + 9 query hook tests).
- [x] Working tree ready to commit as Slice 1.
