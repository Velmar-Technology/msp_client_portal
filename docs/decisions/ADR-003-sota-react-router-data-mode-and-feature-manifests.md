# ADR-003: SOTA React Router v7 Data Mode with Colocated Feature Route Manifests and TanStack Query Preloading

## Status
Accepted

## Date
2026-09-03

## Context
Following the successful adoption of [ADR-001](ADR-001-contract-first-monolith-and-tanstack-query.md) (Contract-First Monolith and TanStack Query state delegation) and [ADR-002](ADR-002-frontend-colocated-feature-architecture.md) (Frontend Colocated Feature Folder Architecture), the client routing layer remained structured using legacy declarative JSX `<BrowserRouter>`, `<Routes>`, and `<Route>` primitives in `client/src/App.tsx` alongside a centralized 450-line `protected-routes.tsx` configuration file.

This legacy routing model presented several architectural limitations in a multi-tenant enterprise portal:
1. **Waterfall Data Fetching:** Components could only begin fetching server data *after* their JavaScript chunks were downloaded, parsed, and rendered, resulting in sequential loading spinners rather than instantaneous page transitions.
2. **Centralized Routing Bottleneck:** Adding or modifying a route required modifying the monolithic `protected-routes.tsx` file and maintaining external `routeCrumbs` string-matching maps, violating ADR-002 feature encapsulation.
3. **Decoupled Route Preloading:** Intent-based preloading (on hover/focus) was manually mapped via a static lookup dictionary rather than deriving dynamically from the router tree and query cache.
4. **Scattered Access & Guard Metadata:** Role permissions (`allowedRoles`), subscription feature gating (`requiredFeature`), breadcrumbs, and page titles were declared across disparate wrapper files rather than typed directly onto route definitions.

We require a modern routing architecture that leverages React Router v7's Data Router engine (`createBrowserRouter`) to enable parallel data prefetching, decentralized feature route manifests, and end-to-end type safety.

---

## Decision

We adopt **React Router v7 Data Mode with Colocated Feature Route Manifests and TanStack Query Cache Preloading**:

### 1. Decentralized Feature Route Manifests (`features/<domain>/routes.tsx`)
Every business module in `client/src/features/<domain>/` defines its own route tree as a typed `RouteObject[]` array in `routes.tsx`:
* Route definitions specify dynamic chunk loading via the native `lazy: async () => ({ Component, ... })` API.
* Route definitions declare route metadata (breadcrumbs, required subscription feature codes, allowed user roles) directly on `handle: AppRouteHandle`.
* Every feature's `index.ts` public gateway exports its route array (e.g., `export { ticketRoutes } from "./routes";`).
* Deep imports into another feature's `routes.tsx` remain strictly forbidden by ADR-002 lint rules.

### 2. Contract-Coupled TanStack Query Loaders (`ensureQueryData` / `prefetchQuery`)
Route loaders bridge React Router with TanStack Query v5:
* **Critical Header & Detail Data:** Loaders use `queryClient.ensureQueryData(queryOptions)` to await critical entity data before completing navigation, ensuring zero layout shift or skeleton flashing.
* **Secondary / List Data:** Loaders use `queryClient.prefetchQuery(queryOptions)` to initiate background network fetches without blocking the navigation transition.
* **Shared Query Keys & Schemas:** Loaders consume the exact same `queryOptions` functions used by child components and imported from `@shared/contracts`.

### 3. Unified Route Handle Specification (`AppRouteHandle`)
Route metadata is formalized in `client/src/routes/types.ts`:
```typescript
export interface AppRouteHandle {
  crumb?: CrumbResolver;
  allowedRoles?: string[];
  requiredFeature?: FeatureCode;
  title?: string;
}
```

### 4. Modular Root Router Assembly (`client/src/routes/appRouter.tsx`)
The centralized `protected-routes.tsx` file is retired. The root router assembles decentralized feature manifests into a single `createBrowserRouter` hierarchy:
* Public layout wraps authentication routes and static informational pages (`/`, `/terms`, `/privacy`, `/login`, `/register`).
* Authenticated layout (`AppLayout`) wraps all protected business feature route manifests (`ticketRoutes`, `billingRoutes`, `equipmentRoutes`, `crmRoutes`, etc.).
* Global `RouterProvider` is mounted in `client/src/App.tsx`.

### 5. Intent-Based Dual Preloading (Chunk + Query Cache)
The preloader inspects target route objects on user intent (link hover or focus) to execute:
$$\text{Intent (Hover/Focus)} \longrightarrow \text{Chunk Import (route.lazy)} + \text{Query Warm-up (queryClient.prefetchQuery)}$$
This delivers sub-10ms perceived route transition latency.

---

## Consequences

### Positive
* **Instant Transitions & Zero Waterfall:** JS code chunks and API queries load concurrently in the background before component mount.
* **Feature Autonomy:** Adding a new route is completely self-contained within `client/src/features/<domain>/`.
* **DRY Breadcrumbs & Guards:** Role checks, feature flags, and breadcrumb labels are colocated with route declarations.
* **Streamlined Maintenance:** Retires over 450 lines of boilerplate route mapping, string slicing, and manual preloader dictionaries.

### Negative / Trade-offs
* **Discipline on Loader Scope:** Loaders must avoid awaiting heavy analytical queries to prevent perceived route navigation lag; secondary widgets should stream via localized Suspense skeletons.
* **Testing Harness Updates:** Component integration tests rendering routes must use `createMemoryRouter` or `<RouterProvider />` rather than `<BrowserRouter>`.

---

## Architectural Invariant Rules

1. **Route Manifest Colocation:** Every feature directory in `client/src/features/` must contain a `routes.tsx` and export its manifest from `index.ts`.
2. **Public Gateway Invariant:** Cross-feature imports of route objects must go through `@/features/<domain>`, never deep paths.
3. **No Direct Fetch in Loaders:** Route loaders must delegate exclusively to `queryClient` methods (`ensureQueryData` / `prefetchQuery`) using shared contract `queryOptions`.
