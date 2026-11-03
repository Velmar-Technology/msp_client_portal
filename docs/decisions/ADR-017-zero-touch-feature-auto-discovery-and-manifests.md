# ADR-017: Zero-Touch Feature Auto-Discovery, Hierarchical Domain Manifests & Declarative `security.csv` RBAC

## Status
Accepted

## Date
2026-11-03

## Context

In [ADR-001](ADR-001-contract-first-monolith-and-tanstack-query.md), [ADR-002](ADR-002-frontend-colocated-feature-architecture.md), and [ADR-003](ADR-003-sota-react-router-data-mode-and-feature-manifests.md), we established a Contract-First Monolith and organized frontend code into colocated vertical feature folders (`client/src/features/<domain>/`) and backend domains into modular gateways (`server/src/modules/<domain>/`).

Despite this vertical colocation, adding a single new business domain (such as `assets` or `helpdesk/tickets`) still forced developers to manually modify **8 shared central files** across the monorepo:
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
* **Hardcoded Role Coupling (`ADMIN` / `TECHNICIAN` / `CLIENT`):** Routes and sidebar items relied on static `roles` / `allowedRoles` arrays instead of Dynamic RBAC capabilities ([ADR-014](ADR-014-dynamic-database-driven-rbac-and-redis-cached-resolution.md) / `BL-302`), preventing custom database roles from unlocking features without code changes.
* **Lack of First-Class Hierarchy & Declarative Security:** Sub-features (e.g., `helpdesk/tickets`, `helpdesk/kb`, `assets/consumables`) could not declaratively attach sub-items to parent sidebar menus, inherit parent URL prefixes and breadcrumbs, or declare their RBAC matrix in a standalone file like Odoo's `ir.model.access.csv`.

---

## Decision

We adopt **Convention-Based Zero-Touch Auto-Discovery with Full Multi-Layer Hierarchy and Odoo-Style Declarative `security.csv` RBAC** across `packages/contracts`, `server`, and `client`. Adding a top-level feature, a pure parent container (`--container`), or a nested child sub-feature requires **zero edits to existing tracked files** in `git status`.

### 1. Recursive Directory Auto-Discovery (`**/manifest.ts`, `**/security.csv`, `**/locales/*.json`, `**/*.schema.ts`)

Any nested subfolder containing a `manifest.ts` (or `security.csv` / `*.schema.ts` / `*.contract.ts`) is automatically discovered as a feature or sub-module:
* **Frontend:** `import.meta.glob('@/features/**/manifest.{ts,tsx}', { eager: true })` and `import.meta.glob('@/features/**/locales/*.json', { eager: true })`.
* **Backend:** `server/scripts/sync-registry.cjs` recursively traverses `server/src/modules/**` to discover `manifest.ts`, `security.csv`, and `*.schema.ts` at any depth, generating:
  * `server/src/shared/db/schemas.generated.ts`
  * `server/src/shared/registry/modules.generated.ts`
  * `server/src/shared/registry/permissions.generated.ts` (pure static permission & `security.csv` rules without importing Express routers or controllers at module load time).
* **Contracts:** `packages/contracts/scripts/sync-barrel.js` recursively traverses `packages/contracts/src/**` to export flat and nested contract modules into `contracts.generated.ts`.

---

### 2. Frontend Feature Manifest, Route Hierarchy & Capability-First Sidebar (`client/src/routes/featureRegistry.ts`)

Each frontend feature, parent container, or child sub-feature exports a `FeatureManifest` gated by `requiredPermission` (replacing hardcoded `roles` / `allowedRoles` arrays):

```typescript
// Parent Container Feature: client/src/features/helpdesk/manifest.ts
export const featureManifest: FeatureManifest = {
  id: 'helpdesk',
  routes: helpdeskRoutes, // Redirects '/helpdesk' -> '/helpdesk/tickets'
  navItems: [
    {
      to: '/helpdesk',
      icon: Ticket,
      labelKey: 'helpdesk',
      group: 'operations',
      order: 70,
    },
  ],
};

// Child Sub-Feature: client/src/features/helpdesk/tickets/manifest.ts
export const featureManifest: FeatureManifest = {
  id: 'helpdesk.tickets',
  parentId: 'helpdesk',
  routes: ticketRoutes,
  navItems: [
    {
      to: '/helpdesk/tickets',
      parentTo: '/helpdesk',
      icon: Ticket,
      labelKey: 'tickets',
      group: 'operations',
      order: 10,
      counterKey: 'tickets',
      requiredPermission: ['helpdesk:tickets:read', 'tickets:read'],
    },
  ],
};
```

* **Dynamic RBAC Primary Check (`BL-302` / `ADR-014`):**
  * When `user.permissions` is hydrated and `requiredPermission` is declared (`string | string[]`), both `mergeFeatureNavItems` and `RouteGuard` evaluate **`hasFrontendPermission(user.permissions, requiredPermission)` as the sole authorization decision**—never blocking a user based on legacy `roles` / `allowedRoles` arrays.
  * Granting a capability (e.g., `assets:read` or `helpdesk:tickets:read`) to any custom role in PostgreSQL immediately unlocks the sidebar item and route.
* **Sidebar Sub-Item Injection (`parentTo`) & Empty Container Pruning:**
  * When a `FeatureNavEntry` specifies `parentTo` (e.g., `'/helpdesk'`, `'/assets'`, `'/settings-group'`), `mergeFeatureNavItems` attaches it into that parent item's collapsible `items` sub-menu sorted by numeric `order`.
  * If all child sub-items under a parent container are filtered out by Dynamic RBAC permissions, `mergeFeatureNavItems` automatically omits the empty parent container from the sidebar.
* **Route Prefix & Breadcrumb Chaining (`parentId` & `mountInsideParentOutlet`):**
  * When `parentId` is specified, `resolveFeatureRoutes` automatically prefixes relative child route paths with the parent's primary path (`/helpdesk/tickets`, `/helpdesk/kb`) and chains the parent's `handle.crumb` before the child's.
  * Setting `mountInsideParentOutlet: true` mounts the child routes directly inside the parent route's React Router `children` (`<Outlet />`).

---

### 3. Colocated Feature Translations (`client/src/features/**/locales/*.json`)

Feature translations live alongside the feature or sub-feature in `locales/en_US.json` and `es_DO.json`:

* **Runtime Deep-Merge (`client/src/i18n.ts`):** Deep-merges all colocated `features/**/locales/*.json` dictionaries into the base `en_US` and `es_DO` resources at startup.
* **Static Parity Enforcement (`client/scripts/check-i18n.mjs`):** Recursively scans `src/features/**/locales/*.json` alongside `src/locales/*.json` to enforce 100% `en_US` / `es_DO` key parity and zero unmapped `t("...")` calls.

---

### 4. Backend Module Hierarchy, Specificity Mounting & Declarative `security.csv` (`server/src/modules/**/`)

#### A. Clean Module Manifests & Specificity-Sorted Route Mounting
Each backend module or sub-module colocates its Drizzle schema (`*.schema.ts`), `ServerModuleManifest` (`manifest.ts`), and declarative RBAC matrix (`security.csv`):

```typescript
// Pure Parent Container: server/src/modules/helpdesk/manifest.ts
export const moduleManifest: ServerModuleManifest = {
  id: 'helpdesk',
  basePrefix: '/helpdesk',
};

// Child Sub-Module: server/src/modules/helpdesk/tickets/manifest.ts
export const moduleManifest: ServerModuleManifest = {
  id: 'helpdesk.tickets',
  parentId: 'helpdesk',
  routes: [{ prefix: '/tickets', router: ticketRoutes }],
};
```

* **Hierarchical Gateway Prefixing (`resolveModuleRouteMounts`):** Child modules declaring `parentId: 'helpdesk'` automatically mount their routes under the parent's `basePrefix` (e.g., `prefix: '/tickets'` $\rightarrow$ `/helpdesk/tickets`).
* **Specificity-Sorted Route Precedence:** `resolveModuleRouteMounts` sorts all resolved route mounts **most-specific first** (deepest path segments first, then longest prefix) so parameterized parent routes (`GET /helpdesk/:id`) can never shadow child sub-module routes (`GET /helpdesk/tickets`).

#### B. Odoo-Style Colocated `security.csv` (`code,module,description,roles`)
Inspired by Odoo's `ir.model.access.csv`, each module defines its atomic capabilities and default role bindings in a colocated `security.csv` file that maps 1:1 to the PostgreSQL `permissions` and `role_permissions` tables:

```csv
code,module,description,roles
helpdesk:tickets:read,helpdesk,View support tickets and timelines,ADMIN|TECHNICIAN|CLIENT
helpdesk:tickets:create,helpdesk,Create support tickets and responses,ADMIN|TECHNICIAN|CLIENT
helpdesk:tickets:update,helpdesk,Update ticket status and assign technicians,ADMIN|TECHNICIAN
helpdesk:tickets:delete,helpdesk,Delete support tickets,ADMIN
helpdesk:tickets:manage,helpdesk,Full management of helpdesk tickets,ADMIN
```

* **Compile-Time Parsing & Type Emission (`sync-registry.cjs`):** `parseSecurityCsv` reads every `server/src/modules/**/security.csv` and emits:
  1. `server/src/shared/registry/permissions.generated.ts` containing `registeredSecurityRules`, `registeredModulePermissions`, and `ALL_SYSTEM_PERMISSION_CODES`.
  2. `packages/contracts/src/auth/permissions.generated.ts` exporting `SystemPermissionCode` union types and `packages/contracts/src/auth/permissions.contract.ts` exporting `PermissionRequirement`.
  3. This ensures express middleware (`requirePermission(...)`) and client manifests (`requiredPermission: '...'`) have 100% compile-time autocomplete and typo protection.
* **Idempotent PostgreSQL Synchronization (`PermissionService.syncPermissionCatalog()`):**
  1. Upserts all `(code, module, description)` rows into `permissions` (`ON CONFLICT (code) DO NOTHING`).
  2. Calls `PermissionRepository.seedRolePermissions` to ensure default system roles exist and inserts `(role_id, permission_id)` into `role_permissions` (`ON CONFLICT DO NOTHING` so custom Admin edits in PostgreSQL are never overwritten).

#### C. Principle of Least Privilege (`BL-302` / `ADR-014`)
1. **Atomic CRUD Capabilities & Deny-by-Default Scaffolding:** `npm run gen:module <path>` automatically scaffolds `server/src/modules/<path>/security.csv` with atomic `:read`, `:create`, `:update`, `:delete` rows and defaults to **Deny-by-Default** (`ADMIN` only unless `--roles=CLIENT,TECHNICIAN,ADMIN` is explicitly passed). Passing `--container` (`--is-group`) scaffolds a pure parent container without dummy DB tables or CRUD routes.
2. **Explicit Sub-Module Scopes (No Implicit Parent Leakage):** In `matchesHierarchicalPermission` (`PermissionService.ts`) and `hasFrontendPermission` (`routeUtils.tsx`), a parent capability (`helpdesk:read` or `helpdesk:manage`) does **NOT** implicitly grant access to child sub-modules (`helpdesk:tickets:read`). Child sub-modules require their own explicit capability or an explicit namespace wildcard (`helpdesk:*`).
3. **Same-Scope Action Dominance:** Within the **exact same module scope**, `manage` $\supset$ `{write, create, update, delete, read}` and `write` $\supset$ `{create, update, read}` (e.g., `helpdesk:tickets:manage` satisfies `helpdesk:tickets:read` and `helpdesk:tickets:create`).

---

### 5. Database Migration & Schema Evolution Playbook

#### A. Generating Migrations for New Features (`--with-migration`)
When scaffolding new domains or tables:
1. Run `npm run gen:module <path> --with-migration`.
2. The CLI inspects `server/src/shared/db/migrations/` for existing `(\d{3})_*.sql` files, determines the next sequential index (e.g. `052`), and creates `server/src/shared/db/migrations/${nextNum}_create_${table}_table.sql`.
3. The generated SQL migration includes:
   - DDL creating the table with UUID primary key and `tenant_id` foreign key referencing `tenants(id) ON DELETE CASCADE`.
   - Indexing on `tenant_id` and `status`.
   - Fail-closed PostgreSQL Row-Level Security (`ENABLE ROW LEVEL SECURITY; FORCE ROW LEVEL SECURITY;`) and tenancy isolation policy (`BL-302`).
4. Execute `npm -w server run db:migrate` to apply the migration.
5. In Git workflows, committing migration files in `server/src/shared/db/migrations/` is protected by `scripts/check-protected-paths.mjs` and requires `ALLOW_PROTECTED_CHANGES=1` when intentional.

#### B. Colocated Drizzle Schemas & Cyclic Dependency Prevention
* Every domain schema resides in `server/src/modules/<domain>/<name>.schema.ts` and is automatically re-exported in `server/src/shared/db/schemas.generated.ts`.
* **Zero Gateway Cycle Invariant:** Pure `*.schema.ts` files must **never** import from module root index gateways (`@modules/<domain>`), as doing so loads controllers and services that require `@shared/db`, creating an uninstantiated class circular deadlock. Cross-module Drizzle foreign keys must import peer schema files directly (e.g., `import { tickets } from '@modules/helpdesk/tickets/tickets.schema'`).

#### C. Legacy Schema Decoupling Protocol
To migrate tables from the monolithic `server/src/shared/db/schema.ts` into modular ADR-017 directories:
1. **Never rename existing tables or modify existing SQL migration files.**
2. Move table declarations from `server/src/shared/db/schema.ts` into `server/src/modules/<domain>/<domain>.schema.ts`.
3. Retain core identity and foundation tables (`tenants`, `users`, `roles`, `permissions`, `user_roles`) in `schema.ts`.
4. Run `npm run sync` (`node server/scripts/sync-registry.cjs`) to update `schemas.generated.ts`.
5. Since `server/src/shared/db/index.ts` re-exports both base schema and `schemas.generated.ts`, legacy imports (`import { leads } from '@shared/db'`) remain 100% backward-compatible.
6. Extract permission strings into `server/src/modules/<domain>/security.csv` and register module endpoints in `manifest.ts`.

---

## Consequences

### Positive
* **True Zero-Touch Extension:** Creating a new top-level feature, parent container, or nested sub-feature modifies **0 existing tracked files** in `git status`.
* **Declarative Auditable Security (`security.csv`):** Every module's RBAC capabilities and default role grants are readable and editable in a clean, spreadsheet-compatible `security.csv` file colocated with the module.
* **100% Dynamic RBAC Native:** Eliminates hardcoded `ADMIN` / `TECHNICIAN` / `CLIENT` role checks from routes and manifests in favor of `requiredPermission` / `requirePermission` / `requireAnyPermission`.
* **Compile-Time & Bundle Safety:** Preserves 100% TypeScript type inference (`tsc --noEmit`) and single-file CJS bundling (`tsup`).

### Negative / Trade-offs
* **Generated Files on Fresh Clone:** Because `*.generated.ts` files are git-ignored to keep commits conflict-free, `sync-barrel.js` and `sync-registry.cjs` execute automatically via lifecycle hooks (`predev`, `prebuild`, `pretest`, `pretypecheck`, `tsup.config.ts`, and `vitest.config.ts`).
