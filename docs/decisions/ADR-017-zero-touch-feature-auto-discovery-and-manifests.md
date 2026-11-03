# ADR-017: Zero-Touch Feature Auto-Discovery & Hierarchical Domain Manifests

## Status
Accepted

## Date
2026-11-03

## Context

In [ADR-001](ADR-001-contract-first-monolith-and-tanstack-query.md), [ADR-002](ADR-002-frontend-colocated-feature-architecture.md), and [ADR-003](ADR-003-sota-react-router-data-mode-and-feature-manifests.md), we established a Contract-First Monolith and organized frontend code into colocated vertical feature folders (`client/src/features/<domain>/`) and backend domains into modular gateways (`server/src/modules/<domain>/`).

Despite this vertical colocation, adding a single new business domain (such as `assets`) still forced developers to manually modify **8 shared central files** across the monorepo:
1. `client/src/routes/appRouter.tsx` — Manual import and spread of `<domain>Routes` into `protectedFeatureRoutes`.
2. `client/src/hooks/useSidebar.ts` — Manual icon import and insertion into hardcoded `clientNavItems`, `techNavItems`, and `adminNavItems` arrays.
3. `client/src/locales/en_US.json` — Adding feature translation keys and `nav.<domain>` labels to a 2,500+ line monolithic JSON file.
4. `client/src/locales/es_DO.json` — Duplicating the same keys in Spanish inside a central JSON file.
5. `packages/contracts/src/index.ts` — Manually appending `export * from './<domain>/<domain>.contract'`.
6. `server/src/shared/middleware/gatewayRouterMiddleware.ts` — Manually importing `<domain>Routes` and mounting `gatewayClusterRouter.use('/<domain>', <domain>Routes)`.
7. `server/src/modules/auth/services/PermissionService.ts` — Manually adding `<domain>:read` / `<domain>:manage` capability strings to `ALL_SYSTEM_PERMISSIONS`, `TECHNICIAN_DEFAULT_PERMISSIONS`, and `CLIENT_DEFAULT_PERMISSIONS`.
8. `server/src/shared/db/schema.ts` — Appending domain `pgTable` definitions to a 950+ line shared Drizzle schema file.

### Architectural Friction
* **Violation of the Open/Closed Principle (OCP):** Core infrastructure files (`appRouter.tsx`, `useSidebar.ts`, `gatewayRouterMiddleware.ts`, `PermissionService.ts`, `schema.ts`) had to be modified every time the system was extended with a new domain or sub-domain.
* **High Merge-Conflict Surface:** Concurrent feature branches inevitably collided at the bottom of `en_US.json`, `es_DO.json`, `schema.ts`, `packages/contracts/src/index.ts`, and `gatewayRouterMiddleware.ts`.
* **Lack of First-Class Hierarchy:** Sub-features (e.g., `assets/consumables` or `crm/quotes`) could not declaratively attach sub-items to parent sidebar menus, inherit parent URL prefixes and breadcrumbs, or inherit parent RBAC scopes without manual wiring.

---

## Decision

We adopt **Convention-Based Zero-Touch Auto-Discovery with Full Multi-Layer Hierarchy** across `packages/contracts`, `server`, and `client`. Adding a top-level feature or a nested child sub-feature requires **zero edits to existing tracked files** in `git status`.

### 1. Recursive Directory Auto-Discovery (`**/manifest.ts`, `**/locales/*.json`, `**/*.schema.ts`)

Any nested subfolder containing a `manifest.ts` (or `*.schema.ts` / `*.contract.ts`) is automatically discovered as a child feature or sub-module:
* **Frontend:** `import.meta.glob('@/features/**/manifest.{ts,tsx}', { eager: true })` and `import.meta.glob('@/features/**/locales/*.json', { eager: true })`.
* **Backend:** `server/scripts/sync-registry.cjs` recursively traverses `server/src/modules/**` to discover `manifest.ts` and `*.schema.ts` at any depth.
* **Contracts:** `packages/contracts/scripts/sync-barrel.js` recursively traverses `packages/contracts/src/**` to export flat and nested contract modules.

---

### 2. Frontend Feature Manifest, Route Hierarchy & Sidebar Sub-Items (`client/src/routes/featureRegistry.ts`)

Each frontend feature or child sub-feature exports a `FeatureManifest`:

```typescript
// Parent Feature: client/src/features/assets/manifest.ts
export const featureManifest: FeatureManifest = {
  id: 'assets',
  routes: assetsRoutes,
  navItems: [
    {
      to: '/assets',
      icon: Boxes,
      labelKey: 'assets',
      group: 'operations',
      order: 25,
      roles: ['CLIENT', 'ADMIN'],
      requiredFeature: FEATURE_CODES.ASSET_LIFECYCLE,
      featureGatedRoles: ['CLIENT'],
    },
  ],
};

// Child Sub-Feature Example: client/src/features/assets/consumables/manifest.ts
export const featureManifest: FeatureManifest = {
  id: 'assets.consumables',
  parentId: 'assets',
  mountInsideParentOutlet: false, // Standalone page at /assets/consumables (or true for <Outlet />)
  routes: [
    {
      path: 'consumables',
      element: <ConsumablesPage />,
      handle: {
        crumb: (t) => ({ label: t('assets.tabs.consumables'), to: '/assets/consumables' }),
      },
    },
  ],
  navItems: [
    {
      to: '/assets/consumables',
      labelKey: 'consumables',
      parentTo: '/assets', // Injects as a collapsible sub-item under /assets (or /settings-group)
      order: 20,
      roles: ['ADMIN'],
    },
  ],
};
```

* **Sidebar Sub-Item Injection (`parentTo`):** When a `FeatureNavEntry` specifies `parentTo` (e.g., `'/assets'`, `'/settings-group'`, `'/account-group'`), `mergeFeatureNavItems` attaches it into that parent item's `items` sub-menu sorted by numeric `order`.
* **Route Prefix & Breadcrumb Chaining (`parentId` & `mountInsideParentOutlet`):**
  * When `parentId` is specified, `resolveFeatureRoutes` automatically prefixes relative child route paths with the parent's primary path (`/assets/consumables`) and chains the parent's `handle.crumb` before the child's (`Home > Assets > Consumables`).
  * Setting `mountInsideParentOutlet: true` mounts the child routes directly inside the parent route's React Router `children` (`<Outlet />`).

---

### 3. Colocated Feature Translations (`client/src/features/**/locales/*.json`)

Feature translations live alongside the feature or sub-feature in `locales/en_US.json` and `es_DO.json`:

* **Runtime Deep-Merge (`client/src/i18n.ts`):** Deep-merges all colocated `features/**/locales/*.json` dictionaries into the base `en_US` and `es_DO` resources at startup.
* **Static Parity Enforcement (`client/scripts/check-i18n.mjs`):** Recursively scans `src/features/**/locales/*.json` alongside `src/locales/*.json` to enforce 100% `en_US` / `es_DO` key parity and zero unmapped `t("...")` calls.

---

### 4. Backend Module Hierarchy & Dynamic RBAC Least Privilege (`server/src/modules/**/`)

Each backend module or sub-module colocates its Drizzle schema (`*.schema.ts`) and `ServerModuleManifest` (`manifest.ts`):

```typescript
// server/src/modules/helpdesk/tickets/manifest.ts
export const moduleManifest: ServerModuleManifest = {
  id: 'helpdesk.tickets',
  parentId: 'helpdesk',
  routes: [{ prefix: '/tickets', router: ticketRoutes }],
  permissions: {
    admin: [
      'helpdesk:tickets:read',
      'helpdesk:tickets:create',
      'helpdesk:tickets:update',
      'helpdesk:tickets:delete',
      'helpdesk:tickets:manage',
    ],
    technician: [
      'helpdesk:tickets:read',
      'helpdesk:tickets:create',
      'helpdesk:tickets:update',
    ],
    client: ['helpdesk:tickets:read', 'helpdesk:tickets:create'],
  },
};
```

* **Hierarchical Gateway Prefixing (`resolveModuleRouteMounts`):** Child modules declaring `parentId: 'helpdesk'` automatically mount their routes under the parent's prefix (e.g., `prefix: '/tickets'` $\rightarrow$ `/helpdesk/tickets`).
* **Dynamic RBAC & Principle of Least Privilege (`BL-302` / `ADR-014`):**
  1. **Atomic CRUD Capabilities & Deny-by-Default Scaffolding:** Modules declare granular atomic capabilities (`<scope>:read`, `<scope>:create`, `<scope>:update`, `<scope>:delete`). `npm run gen:module` defaults to **Deny-by-Default** (`roles: ['ADMIN']`, `technician: []`, `client: []`) unless `--roles=CLIENT,TECHNICIAN,ADMIN` is explicitly passed.
  2. **Explicit Sub-Module Scopes (No Implicit Parent Leakage):** In `matchesHierarchicalPermission` (`PermissionService.ts`) and `hasFrontendPermission` (`routeUtils.tsx`), a parent capability (`helpdesk:read` or `helpdesk:manage`) does **NOT** implicitly grant access to child sub-modules (`helpdesk:tickets:read`). Child sub-modules require their own explicit capability or an explicit namespace wildcard (`helpdesk:*`).
  3. **Same-Scope Action Dominance:** Within the **exact same module scope**, `manage` $\supset$ `{write, create, update, delete, read}` and `write` $\supset$ `{create, update, read}` (e.g., `helpdesk:tickets:manage` satisfies `helpdesk:tickets:read` and `helpdesk:tickets:create`).
  4. **Frontend Dual-Check Capability Gating (`RouteGuard` & `useSidebar`):** Frontend `FeatureNavEntry` and `AppRouteHandle` support `requiredPermission`. When `user.permissions` is populated from Dynamic DB RBAC, both `RouteGuard` and `mergeFeatureNavItems` enforce `hasFrontendPermission(user.permissions, requiredPermission)` (falling back to `allowedRoles` only when `user.permissions` is undefined).
  5. **Idempotent DB Catalog Sync (`PermissionService.syncPermissionCatalog()`):** Auto-discovered `registeredModulePermissions` in `permissions.generated.ts` are merged and idempotently upserted (`ON CONFLICT (code) DO NOTHING`) into the PostgreSQL `permissions` table so newly scaffolded modules immediately appear in Dynamic RBAC and Role Mining (`BL-302`).

---

## Consequences

### Positive
* **True Zero-Touch Extension:** Creating a new top-level feature or nested sub-feature modifies **0 existing tracked files** in `git status`.
* **Multi-Level Hierarchy Out of the Box:** Features can nest on disk, inject ordered sub-items into parent sidebar menus, inherit URL prefixes and breadcrumb trails, and inherit parent RBAC permissions.
* **Compile-Time & Bundle Safety:** Preserves 100% TypeScript type inference (`tsc --noEmit`) and single-file CJS bundling (`tsup`).

### Negative / Trade-offs
* **Generated Files on Fresh Clone:** Because `*.generated.ts` files are git-ignored to keep commits conflict-free, `sync-barrel.js` and `sync-registry.cjs` execute automatically via lifecycle hooks (`predev`, `prebuild`, `pretest`, `pretypecheck`, `tsup.config.ts`, and `vitest.config.ts`).
