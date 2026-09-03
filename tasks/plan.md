# Implementation Plan: SOTA React Router v7 Data Mode & Colocated Feature Route Manifests (ADR-003)

## Overview
Elevate `msp_client_portal` frontend routing architecture to State-of-the-Art (SOTA) by transitioning from legacy declarative JSX `<Routes>` to **React Router v7 Data Router (`createBrowserRouter`)** integrated with **ADR-001 (Contract-First + TanStack Query v5 Cache Preloading)** and **ADR-002 (Colocated Feature Route Manifests)**.

Work is structured into 4 sequential milestones:
1. **Milestone 1 — Core Router Infrastructure & ADR-003 Foundation (P0):** Formalize ADR-003, implement typed route utilities, route handles, and root `createBrowserRouter` assembly in `App.tsx`.
2. **Milestone 2 — Feature Route Manifests (Phase A: Auth, Tickets, Billing & Subscriptions) (P0):** Colocate route definitions and TanStack Query `ensureQueryData` / `prefetchQuery` loaders in high-traffic business domains.
3. **Milestone 3 — Feature Route Manifests (Phase B: Equipment, RMM, CRM, Financial, Users, Dashboard & Settings) (P1):** Complete decentralized route manifests across all remaining 8 feature domains.
4. **Milestone 4 — Architecture Gates, Preloading & Legacy Purge (P1):** Add AST test rules for route manifests, optimize hover/intent chunk & query prefetching, and purge legacy `protected-routes.tsx`.

---

## Architecture Decisions & Constraints

- **Decentralized Colocated Manifests (ADR-002):** Every business module in `client/src/features/<domain>/` exports a `routes.tsx` containing its typed `RouteObject[]` slice. Deep imports remain forbidden.
- **Contract-Coupled Loaders (ADR-001):** Route loaders execute `queryClient.ensureQueryData` or `queryClient.prefetchQuery` using `queryOptions()` derived directly from `@shared/contracts` schemas.
- **Zero-Flicker Layout Transitions:** Component chunks (`lazy: () => import(...)`) and server query caches load in parallel before navigation finishes, accompanied by localized Suspense skeletons (`DashboardSkeleton`, `TablePageSkeleton`, `DetailSkeleton`).
- **Unified Role & Feature Guards:** Authentication, RBAC (`allowedRoles`), subscription feature entitlement (`requiredFeature`), and breadcrumb resolution (`handle.crumb`) are declared natively on route `handle` metadata.
- **Backward Compatibility & Zero Regressions:** Existing test suites (127+ server tests, client vitest, arch tests, a11y) must remain 100% green at every checkpoint.

---

## Dependency Graph

```
Milestone 1: Core Router Infrastructure & ADR-003 (P0)
   ├── Task 1: Formalize ADR-003 Decision Record
   ├── Task 2: Shared Route Types, Handles & Loader Helpers
   └── Task 3: Root createBrowserRouter & App.tsx RouterProvider
   └── Checkpoint 1: Core Router Infrastructure Active
          │
          ▼
Milestone 2: Feature Route Manifests - Phase A (P0)
   ├── Task 4: Auth & Public Route Manifests (auth, public)
   ├── Task 5: Tickets Domain Route Manifest with Query Loaders
   └── Task 6: Billing & Subscriptions Route Manifests
   └── Checkpoint 2: Core Business Route Slices Verified
          │
          ▼
Milestone 3: Feature Route Manifests - Phase B (P1)
   ├── Task 7: Equipment & RMM Maintenance Route Manifests
   ├── Task 8: CRM & Financial Route Manifests
   └── Task 9: Users, Settings, Dashboard & System Route Manifests
   └── Checkpoint 3: All 12 Domains Colocated & Assembled
          │
          ▼
Milestone 4: Architecture Gates, Preloading & Purge (P1)
   ├── Task 10: AST Boundary & Architecture Tests for Route Manifests
   ├── Task 11: Intent Preloading & Cache Warm-Up on Link Hover
   └── Task 12: Purge Legacy protected-routes.tsx & Run Verification Gates
   └── Checkpoint 4: SOTA DoD Cleared
```

---

## Task List Index

Detailed tasks with full acceptance criteria and file lists are recorded in [`tasks/todo.md`](./todo.md).

### Milestone 1: Core Router Infrastructure & ADR-003 Foundation
- [x] Task 1: Formalize ADR-003 Decision Record (`docs/decisions/ADR-003-sota-react-router-data-mode-and-feature-manifests.md`)
- [x] Task 2: Implement Shared Route Types, Route Handles & Loader Utilities (`client/src/routes/types.ts`, `routeUtils.tsx`)
- [x] Task 3: Build Root `createBrowserRouter` Assembly & Wire `App.tsx` `<RouterProvider />`
- [x] Checkpoint 1: Core Router Infrastructure Active

### Milestone 2: Feature Route Manifests (Phase A: Auth, Tickets, Billing & Subscriptions)
- [x] Task 4: Colocate Auth & Public Route Manifests (`features/auth/routes.tsx`, `features/auth/index.ts`)
- [x] Task 5: Colocate Tickets Domain Route Manifest with TanStack Query Loaders (`features/tickets/routes.tsx`)
- [x] Task 6: Colocate Billing & Subscriptions Domain Route Manifests (`features/billing/routes.tsx`, `features/subscriptions/routes.tsx`)
- [x] Checkpoint 2: Core Business Route Slices Verified

### Milestone 3: Feature Route Manifests (Phase B: Equipment, RMM, CRM, Financial, Users, Dashboard & Settings)
- [x] Task 7: Colocate Equipment & RMM Maintenance Route Manifests (`features/equipment/routes.tsx`, `features/rmm/routes.tsx`)
- [x] Task 8: Colocate CRM & Financial Domain Route Manifests (`features/crm/routes.tsx`, `features/financial/routes.tsx`)
- [x] Task 9: Colocate Users, Settings, Dashboard & System Route Manifests (`features/users/routes.tsx`, `features/settings/routes.tsx`, `features/dashboard/routes.tsx`, `features/system/routes.tsx`)
- [x] Checkpoint 3: All 12 Domains Colocated & Assembled

### Milestone 4: Architecture Gates, Preloading & Legacy Purge
- [x] Task 10: Fortify AST Architecture & Boundary Tests for Route Manifests (`client/tests/arch/feature-architecture.test.ts`)
- [x] Task 11: Implement SOTA Route Preloading & Hover Prefetching Hooks (`client/src/lib/preloadRoute.ts`)
- [x] Task 12: Purge Legacy `protected-routes.tsx` & Run Monorepo Quality Gates
- [x] Checkpoint 4: SOTA Definition of Done Cleared

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **Blocking Route Loaders Delaying Transitions:** Heavy queries in `loader` could make page transitions feel sluggish on slow 3G. | High | Use `queryClient.prefetchQuery` for non-critical secondary data and only `ensureQueryData` for critical entity headers; pair with top-level navigation progress bar (`useNavigation().state === "loading"`). |
| **Circular Dependencies during Feature Manifest Assembly:** Aggregating all feature manifests into `appRouter.tsx` could trigger circular dependencies if features import each other. | Medium | Enforce that route manifests only import from their own feature directory and export pure `RouteObject[]` arrays via public gateways. |
| **Auth Session State Hydration Timing:** If `createBrowserRouter` runs before auth token is validated, false redirect to `/login` could occur. | High | Encapsulate auth guard inside layout routes / `<RouteGuard>` element components that reactively read `useAuth()` state rather than executing one-time loader redirects for session validation. |
