# Implementation Tasks: SOTA React Router v7 Data Mode & Colocated Feature Route Manifests (ADR-003)

## Milestone 1: Core Router Infrastructure & ADR-003 Foundation (P0)

### Task 1: Formalize ADR-003 Decision Record
**Description:** Create `docs/decisions/ADR-003-sota-react-router-data-mode-and-feature-manifests.md` documenting the transition from declarative JSX `<Routes>` to React Router v7 Data Router (`createBrowserRouter`), TanStack Query cache loaders, colocated feature manifests (`features/<domain>/routes.tsx`), and route handle guard patterns.
**Acceptance criteria:**
- [x] ADR-003 document created following the standard format (Status, Context, Decision, Alternatives Considered, Consequences).
- [x] References ADR-001 (TanStack Query delegation) and ADR-002 (Colocated feature architecture).
- [x] Explains route `loader` integration with `queryClient.ensureQueryData` and route `handle` metadata.
**Verification:**
- [x] File exists and renders valid markdown.
- [x] Cross-references in `tasks/plan.md` resolve correctly.
**Dependencies:** None  
**Files touched:**
- `docs/decisions/ADR-003-sota-react-router-data-mode-and-feature-manifests.md`
**Estimated scope:** Small (1 file)

---

### Task 2: Implement Shared Route Types, Route Handles & Loader Utilities
**Description:** Implement `client/src/routes/types.ts` and `client/src/routes/routeUtils.tsx` providing standard route `handle` interfaces (`AppRouteHandle` for breadcrumbs, `allowedRoles`, and `requiredFeature`), error boundary wrappers (`ChunkErrorBoundary`), and a generic loader helper function (`createRouteLoader`) that binds TanStack Query `queryClient`.
**Acceptance criteria:**
- [x] `AppRouteHandle` typed with `crumb?: CrumbResolver`, `allowedRoles?: string[]`, `requiredFeature?: FeatureCode`, and `title?: string`.
- [x] `createRouteLoader` helper wraps query options safely, handling prefetch without breaking on network failure.
- [x] `RouteGuardWrapper` provides declarative role and feature gating inside router layouts.
**Verification:**
- [x] TypeScript compilation succeeds: `npx tsc --noEmit -p client/tsconfig.app.json`
- [x] Unit tests for route helper utilities pass in Vitest.
**Dependencies:** Task 1  
**Files touched:**
- `client/src/routes/types.ts`
- `client/src/routes/routeUtils.tsx`
- `client/src/routes/routeUtils.test.tsx`
**Estimated scope:** Medium (3 files)

---

### Task 3: Build Root `createBrowserRouter` Assembly & Wire `App.tsx` `<RouterProvider />`
**Description:** Create `client/src/routes/appRouter.tsx` using `createBrowserRouter` that defines the top-level route tree (Public layout routes, Authenticated AppLayout shell, and 404 catch-all). Refactor `client/src/App.tsx` to replace `<BrowserRouter><Routes>...</Routes></BrowserRouter>` with `<RouterProvider router={router} />`.
**Acceptance criteria:**
- [x] `client/src/routes/appRouter.tsx` exports `router = createBrowserRouter(...)`.
- [x] Top-level layout handles auth check (`ProtectedRoute`) and global Suspense fallback.
- [x] `client/src/App.tsx` renders `<RouterProvider router={router} />` cleanly under `QueryClientProvider` and `ThemeProvider`.
- [x] Application compiles and renders without browser errors.
**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Tests pass: `npm -w client run test:run`
**Dependencies:** Task 2  
**Files touched:**
- `client/src/routes/appRouter.tsx`
- `client/src/App.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 1: Core Router Infrastructure Active
- [x] ADR-003 documented and committed.
- [x] Typed route handles and loader utilities tested in Vitest.
- [x] `App.tsx` running on `createBrowserRouter` with `<RouterProvider />`.
- [x] Zero TypeScript compilation or lint errors.

---

## Milestone 2: Feature Route Manifests (Phase A: Auth, Tickets, Billing & Subscriptions) (P0)

### Task 4: Colocate Auth & Public Route Manifests
**Description:** Create `client/src/features/auth/routes.tsx` exporting `authRoutes: RouteObject[]` (`/login`, `/register`, `/forgot-password`, `/reset-password`). Colocate public routes in `client/src/routes/publicRoutes.tsx` (`/`, `/terms`, `/privacy`). Wire `authRoutes` to `client/src/features/auth/index.ts` and `appRouter.tsx`.
**Acceptance criteria:**
- [x] `client/src/features/auth/routes.tsx` defines lazy-loaded routes with `PublicRoute` guard.
- [x] `client/src/features/auth/index.ts` re-exports `authRoutes`.
- [x] Public routes (`/`, `/terms`, `/privacy`) mount under `PublicLayout` in `appRouter.tsx`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/auth/`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 3  
**Files touched:**
- `client/src/features/auth/routes.tsx`
- `client/src/features/auth/index.ts`
- `client/src/routes/publicRoutes.tsx`
- `client/src/routes/appRouter.tsx`
**Estimated scope:** Medium (4 files)

---

### Task 5: Colocate Tickets Domain Route Manifest with TanStack Query Loaders
**Description:** Create `client/src/features/tickets/routes.tsx` exporting `ticketRoutes: RouteObject[]` for `/tickets` and `/tickets/:id`. Add route `loader` functions that prefetch ticket lists (`queryClient.prefetchQuery(ticketQueries.list(filters))`) and ensure ticket details (`queryClient.ensureQueryData(ticketQueries.detail(params.id))`). Attach breadcrumb handles. Export from `features/tickets/index.ts`.
**Acceptance criteria:**
- [x] `ticketRoutes` defines `/tickets` and `/tickets/:id` with lazy component chunk resolution.
- [x] Ticket list loader prewarms query cache on navigation.
- [x] Ticket detail loader ensures single-ticket contract data before render.
- [x] `handle.crumb` resolves localized ticket crumbs dynamically.
- [x] `client/src/features/tickets/index.ts` exports `ticketRoutes`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/tickets/`
- [x] Architecture tests pass: `npm -w client run test:arch`
**Dependencies:** Task 3  
**Files touched:**
- `client/src/features/tickets/routes.tsx`
- `client/src/features/tickets/index.ts`
- `client/src/routes/appRouter.tsx`
**Estimated scope:** Small (3 files)

---

### Task 6: Colocate Billing & Subscriptions Domain Route Manifests
**Description:** Create `client/src/features/billing/routes.tsx` (`/billing`) and `client/src/features/subscriptions/routes.tsx` (`/plans`, `/plans/new`, `/plans/:id/edit`). Add loaders prefetching invoice and subscription plans cache. Attach `allowedRoles: ["CLIENT", "ADMIN"]` to route handles. Export via respective `index.ts` gateways.
**Acceptance criteria:**
- [x] `billingRoutes` and `subscriptionRoutes` defined with lazy chunks and query loaders.
- [x] Admin-only plan editor routes enforce `allowedRoles: ["ADMIN"]` via route handle.
- [x] Both feature gateways (`billing/index.ts`, `subscriptions/index.ts`) export their route manifests.
- [x] Mounted in `appRouter.tsx`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/billing/ client/src/features/subscriptions/`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 3  
**Files touched:**
- `client/src/features/billing/routes.tsx`
- `client/src/features/billing/index.ts`
- `client/src/features/subscriptions/routes.tsx`
- `client/src/features/subscriptions/index.ts`
- `client/src/routes/appRouter.tsx`
**Estimated scope:** Medium (5 files)

---

## Checkpoint 2: Core Business Route Slices Verified
- [x] Auth, Tickets, Billing, and Subscriptions route manifests operational.
- [x] Loaders correctly prewarm TanStack Query caches.
- [x] All Vitest tests for migrated domains pass 100% green.

---

## Milestone 3: Feature Route Manifests (Phase B: Equipment, RMM, CRM, Financial, Users, Dashboard & Settings) (P1)

### Task 7: Colocate Equipment & RMM Maintenance Route Manifests
**Description:** Create `client/src/features/equipment/routes.tsx` (`/devices`, `/rmm`, `/resources`) and `client/src/features/rmm/routes.tsx` (`/maintenance`). Attach `requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT` or `FEATURE_CODES.CLOUD_STORAGE` to route handle metadata. Wire query loaders for device inventory and maintenance schedules. Export via `index.ts` gateways.
**Acceptance criteria:**
- [x] `equipmentRoutes` and `rmmRoutes` define lazy-loaded routes with feature entitlement metadata.
- [x] Feature gateways re-export their route arrays.
- [x] Mounted into `appRouter.tsx`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/equipment/ client/src/features/rmm/`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 3  
**Files touched:**
- `client/src/features/equipment/routes.tsx`
- `client/src/features/equipment/index.ts`
- `client/src/features/rmm/routes.tsx`
- `client/src/features/rmm/index.ts`
- `client/src/routes/appRouter.tsx`
**Estimated scope:** Medium (5 files)

---

### Task 8: Colocate CRM & Financial Domain Route Manifests
**Description:** Create `client/src/features/crm/routes.tsx` (`/crm`, `/crm/custom-plans`) and `client/src/features/financial/routes.tsx` (`/financial`). Set `allowedRoles: ["ADMIN"]` in route handles. Add loaders prefetching CRM lead pipeline and financial stats. Export via `index.ts` gateways.
**Acceptance criteria:**
- [x] `crmRoutes` and `financialRoutes` defined with `allowedRoles: ["ADMIN"]`.
- [x] Query prefetch loaders wired for CRM pipeline and financial statistics.
- [x] Gateways export route manifests cleanly.
- [x] Mounted in `appRouter.tsx`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/crm/ client/src/features/financial/`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 3  
**Files touched:**
- `client/src/features/crm/routes.tsx`
- `client/src/features/crm/index.ts`
- `client/src/features/financial/routes.tsx`
- `client/src/features/financial/index.ts`
- `client/src/routes/appRouter.tsx`
**Estimated scope:** Medium (5 files)

---

### Task 9: Colocate Users, Settings, Dashboard & System Route Manifests
**Description:** Create route manifests for the remaining 4 feature domains: `users` (`/admin/users`), `settings` (`/profile`, `/notifications/preferences`, `/password-manager`, `/help`), `dashboard` (`/dashboard`, `/tech/dashboard`), and `system` (`/admin/api-status`, `/dev/style-guide`). Export via feature gateways and integrate into `appRouter.tsx`.
**Acceptance criteria:**
- [x] `usersRoutes`, `settingsRoutes`, `dashboardRoutes`, and `systemRoutes` defined with respective guards and skeletons.
- [x] All 12 feature domains in `client/src/features/` now have a standard `routes.tsx` file.
- [x] `appRouter.tsx` cleanly aggregates all feature route slices without monolithic configuration.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/users/ client/src/features/settings/ client/src/features/dashboard/ client/src/features/system/`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 3  
**Files touched:**
- `client/src/features/users/routes.tsx`
- `client/src/features/users/index.ts`
- `client/src/features/settings/routes.tsx`
- `client/src/features/settings/index.ts`
- `client/src/features/dashboard/routes.tsx`
- `client/src/features/dashboard/index.ts`
- `client/src/features/system/routes.tsx`
- `client/src/features/system/index.ts`
- `client/src/routes/appRouter.tsx`
**Estimated scope:** Large (9 files)

---

## Checkpoint 3: All 12 Feature Domains Route Manifests Colocated & Active
- [x] All 12 feature domains export typed `RouteObject[]` manifests.
- [x] `appRouter.tsx` composes the full application route tree modularly.
- [x] Full client test suite passes (`npm -w client run test:run`).

---

## Milestone 4: Architecture Gates, Preloading & Legacy Purge (P1)

### Task 10: Fortify AST Architecture & Boundary Tests for Route Manifests
**Description:** Update `client/tests/arch/feature-architecture.test.ts` to assert that: (1) every feature in `client/src/features/` contains a `routes.tsx` file, (2) each feature's `index.ts` exports its route manifest, and (3) zero deep imports into `features/*/routes` exist outside `index.ts`.
**Acceptance criteria:**
- [x] Vitest architecture test suite includes route manifest compliance assertions.
- [x] Fails if a new feature is created without a `routes.tsx` or without exporting it from `index.ts`.
- [x] `npm -w client run test:arch` passes 100% green.
**Verification:**
- [x] `npm -w client run test:arch` passes.
**Dependencies:** Task 9  
**Files touched:**
- `client/tests/arch/feature-architecture.test.ts`
- `client/scripts/gen-feature.mjs`
**Estimated scope:** Small (2 files)

---

### Task 11: Implement SOTA Route Preloading & Hover Prefetching Hooks
**Description:** Refactor `client/src/lib/preloadRoute.ts` to inspect the router's route tree on hover/focus, dynamically invoking both lazy chunk preloading (`route.lazy()`) and data cache preloading (`loader()`). Connect to AppLayout navigation items.
**Acceptance criteria:**
- [x] `preloadRoute(path)` triggers both chunk and query cache prefetching on intent (hover/focus).
- [x] Sidebar and top navigation links invoke `preloadRoute` on hover.
- [x] Perceived page transition delay reduced to zero for preloaded routes.
**Verification:**
- [x] Unit tests in `preloadRoute.test.ts` pass.
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 9, Task 10  
**Files touched:**
- `client/src/lib/preloadRoute.ts`
- `client/src/lib/preloadRoute.test.ts`
- `client/src/components/layout/AppLayout.tsx`
**Estimated scope:** Small (3 files)

---

### Task 12: Purge Legacy `protected-routes.tsx` & Run Monorepo Quality Gates
**Description:** Remove obsolete `client/src/protected-routes.tsx` and legacy route glue code. Update `feature-slice-recipe.md` with route manifest colocation guidelines. Run the full monorepo test and typecheck suite.
**Acceptance criteria:**
- [x] `client/src/protected-routes.tsx` safely deleted.
- [x] Zero dangling imports across the monorepo.
- [x] All test suites pass: `npm -w server run test`, `npm -w client run test:run`, `npm -w client run test:arch`, `npm -w client run test:a11y`.
- [x] TypeScript compilation succeeds with 0 errors (`npm -w server run build`, `npm -w client run build`).
**Verification:**
- [x] `npm -w client run test:run` passes.
- [x] `npm -w client run build` passes.
- [x] `npm -w server run build` passes.
**Dependencies:** Task 10, Task 11  
**Files touched:**
- `client/src/protected-routes.tsx` (Deleted)
- `docs/architecture/feature-slice-recipe.md`
**Estimated scope:** Small (2 files)

---

## Checkpoint 4: SOTA Definition of Done Cleared
- [x] Zero legacy declarative `<Routes>` or `protected-routes.tsx` remaining.
- [x] 100% of routes managed via colocated manifests and `createBrowserRouter`.
- [x] Full automated test suite and typechecks passing green across monorepo.
