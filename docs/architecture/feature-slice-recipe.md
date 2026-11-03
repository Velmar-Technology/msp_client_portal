# Canonical Feature Slice Recipe (Zero-Touch Contract-First Monolith)

This document defines the standard, high-velocity engineering recipe for adding or extending features in the `msp_client_portal` repository. Per [ADR-001](../decisions/ADR-001-contract-first-monolith-and-tanstack-query.md), [ADR-002](../decisions/ADR-002-frontend-colocated-feature-architecture.md), [ADR-003](../decisions/ADR-003-sota-react-router-data-mode-and-feature-manifests.md), and [ADR-017](../decisions/ADR-017-zero-touch-feature-auto-discovery-and-manifests.md), adding a new feature or nested child sub-feature requires **zero manual edits to central tracked files**.

---

## Quick Start: One-Command Full-Stack Scaffolding

Run `npm run gen:module` from the workspace root to scaffold the entire vertical slice across `packages/contracts`, `server`, and `client` (including unit tests, Drizzle schema, RBAC permissions, routes, sidebar nav items, and bilingual `en_US`/`es_DO` locales):

```bash
# 1. Scaffold a top-level full-stack feature (contracts + server + client + security.csv + tests)
npm run gen:module warranties

# 2. Scaffold a pure parent container group (e.g. 'helpdesk')
npm run gen:module -- helpdesk --container --order=70

# 3. Scaffold a hierarchical child sub-feature under an existing parent ('helpdesk/tickets')
npm run gen:module -- helpdesk/tickets --roles=CLIENT,TECHNICIAN,ADMIN

# 4. Optional flags
npm run gen:module -- assets/warranties --with-repo
npm run gen:module -- reports --client-only --group=management --order=45
npm run gen:module -- webhooks --server-only
```

---

## The 4-Layer Zero-Touch Vertical Slice Anatomy

```
[ Layer 1: packages/contracts/src/<path>/<name>.contract.ts ]
        │  Auto-discovered by sync-barrel.js -> @shared/contracts
        ▼
[ Layer 2: server/src/modules/<path>/ (<name>.schema.ts + manifest.ts) ]
        │  Auto-discovered by sync-registry.cjs -> Drizzle DB + API Gateway + RBAC
        ▼
[ Layer 3: client/src/features/<path>/locales/{en_US,es_DO}.json ]
        │  Auto-discovered by import.meta.glob in i18n.ts
        ▼
[ Layer 4: client/src/features/<path>/manifest.ts ]
           Auto-discovered by featureRegistry.ts -> AppRouter + Sidebar
```

---

### Step 1: Define the Contract (`packages/contracts/src/<path>/<name>.contract.ts`)

Create your Zod input, update, filter, and response schemas in `packages/contracts/src/<domain>/<domain>.contract.ts` (or nested `packages/contracts/src/<parent>/<child>/<child>.contract.ts`):

```typescript
// packages/contracts/src/assets/assets.contract.ts
import { z } from 'zod';

export const CreateAssetInputSchema = z.object({
  name: z.string().min(1).max(255),
  asset_type: z.enum(['HARDWARE', 'SOFTWARE', 'NETWORK', 'PERIPHERAL']).default('HARDWARE'),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'IN_STORAGE', 'DECOMMISSIONED']).default('ACTIVE'),
});

export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;
```

Build the contracts package (which automatically runs `scripts/sync-barrel.js` to update the git-ignored `contracts.generated.ts` barrel):
```bash
npm run build:packages
```
> **Note:** You **never** need to manually edit `packages/contracts/src/index.ts`.

---

### Step 2: Colocate Backend Schema, Service, Routes & Manifest (`server/src/modules/<path>/`)

Every backend module encapsulates its Drizzle schema, service, controller, Express router, and self-registering manifest inside `server/src/modules/<path>/`:

```
server/src/modules/<domain>/
├── <domain>.schema.ts          # Drizzle pgTable definitions (auto-merged into @shared/db)
├── security.csv                # Odoo-style Dynamic RBAC matrix (code,module,description,roles)
├── manifest.ts                 # ServerModuleManifest (Gateway route prefix + hierarchy parentId)
├── controllers/
│   └── <Domain>Controller.ts   # Express 5 async HTTP handlers (no try/catch boilerplate)
├── services/
│   ├── <Domain>Service.ts      # Business logic & constructor-injected dependencies
│   └── <Domain>Service.test.ts # Unit tests
├── routes/
│   └── <domain>.routes.ts      # Express router with requirePermission() & validate()
└── index.ts                    # Public module gateway
```

#### 2.1 Colocated Drizzle Schema (`<domain>.schema.ts`)
Define your tables in `server/src/modules/<path>/<name>.schema.ts`. Both `@shared/db` and `drizzle.config.ts` automatically discover `*.schema.ts` files across all modules—do **not** edit `server/src/shared/db/schema.ts`.

#### 2.2 Colocated Dynamic RBAC Matrix (`security.csv`) & Backend Manifest (`manifest.ts`)
Declare atomic CRUD capabilities and default role grants in `server/src/modules/<path>/security.csv`:

```csv
code,module,description,roles
helpdesk:tickets:read,helpdesk,View support tickets and timelines,ADMIN|TECHNICIAN|CLIENT
helpdesk:tickets:create,helpdesk,Create support tickets and responses,ADMIN|TECHNICIAN|CLIENT
helpdesk:tickets:update,helpdesk,Update ticket status and assign technicians,ADMIN|TECHNICIAN
helpdesk:tickets:delete,helpdesk,Delete support tickets,ADMIN
```

And export a clean `moduleManifest` from `server/src/modules/<path>/manifest.ts`:

```typescript
// server/src/modules/helpdesk/tickets/manifest.ts
import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import ticketRoutes from './routes/ticket.routes';

export const moduleManifest: ServerModuleManifest = {
  id: 'helpdesk.tickets',
  parentId: 'helpdesk', // Prefixes routes under parent ('/tickets' -> '/helpdesk/tickets')
  routes: [
    { prefix: '/tickets', router: ticketRoutes },
  ],
};
```

> **Least Privilege & Dynamic RBAC (`BL-302` / `ADR-014` / `ADR-017`):**
> - `sync-registry.cjs` compiles all `security.csv` files into `permissions.generated.ts`, and `PermissionService.syncPermissionCatalog()` idempotently seeds both `permissions` and `role_permissions` in PostgreSQL.
> - Parent capabilities (`helpdesk:read` or `helpdesk:manage`) do **not** implicitly leak into child sub-modules (`helpdesk:tickets:*`). Child sub-modules require their own explicit capability or an explicit namespace wildcard (`helpdesk:*`).
> - Action dominance (`manage` $\supset$ `{write, create, update, delete, read}`) applies strictly within the **exact same module scope**.

---

### Step 3: Colocate Frontend Feature, Locales & Manifest (`client/src/features/<path>/`)

Every frontend feature (or nested child sub-feature) lives in `client/src/features/<path>/`:

```
client/src/features/<domain>/
├── locales/
│   ├── en_US.json              # English strings + { "nav": { "<domain>": "..." } }
│   └── es_DO.json              # Spanish strings + { "nav": { "<domain>": "..." } }
├── api/
│   ├── use<Domain>Queries.ts   # TanStack Query hooks, query keys & mutations
│   └── <domain>Service.ts      # Axios client service
├── components/
│   ├── <Domain>Table.tsx       # Domain-specific data table
│   └── <Domain>Modal.tsx       # Domain-specific form dialog
├── hooks/
│   ├── use<Domain>Filters.ts   # URL sync (useUrlState / useSearchParams)
│   └── use<Domain>Modals.ts    # Ephemeral modal open/close state
├── pages/
│   ├── <Domain>Page.tsx        # Top-level route component
│   └── <Domain>Page.test.tsx   # Component unit tests
├── routes.tsx                  # AppRouteObject[] definitions
├── manifest.ts                 # Self-registering FeatureManifest (routes + sidebar navItems)
├── types.ts                    # ONLY local ephemeral UI state types
└── index.ts                    # Public API gateway
```

#### 3.1 Self-Registering Frontend Manifest (`manifest.ts`)
Export `featureManifest` from `client/src/features/<path>/manifest.ts`. Vite's `import.meta.glob` in `client/src/routes/featureRegistry.ts` automatically registers its routes in `appRouter.tsx` and merges its `navItems` into `useSidebar.ts`:

```typescript
// Top-level feature: client/src/features/assets/manifest.ts
import { Boxes } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { assetsRoutes } from './routes';

export const featureManifest: FeatureManifest = {
  id: 'assets',
  routes: assetsRoutes,
  navItems: [
    {
      to: '/assets',
      icon: Boxes,
      labelKey: 'assets',
      group: 'operations', // 'management' | 'operations' | 'account'
      order: 25,           // Numeric position within the sidebar group
      requiredPermission: 'assets:read',
      requiredFeature: FEATURE_CODES.ASSET_LIFECYCLE,
      featureGatedRoles: ['CLIENT'],
    },
  ],
};
```

#### 3.2 Hierarchical Sub-Features (`parentId` & `parentTo`)
To create a child sub-feature (e.g., `client/src/features/assets/warranties/manifest.ts`):
- Set `parentId: 'assets'` on `FeatureManifest` to automatically prefix relative route paths (`/assets/warranties`) and chain parent breadcrumbs (`Home > Assets > Warranties`). Set `mountInsideParentOutlet: true` if the child route should render inside the parent component's `<Outlet />`.
- Set `parentTo: '/assets'` (or `'/settings-group'`, `'/account-group'`) on `navItems` to inject the link as a collapsible sub-item under the parent sidebar entry sorted by `order`.

---

## Verification Checklist (Definition of Done)

```bash
# 1. Verify 100% en_US / es_DO locale parity and zero unmapped t("...") keys
npm -w client run i18n:check

# 2. Verify ADR-002 / ADR-017 architectural boundaries
npm -w client run test:arch

# 3. Build packages, backend, and frontend
npm run build:packages
npm -w server run build
npm -w client run build

# 4. Run unit test suites
npm -w server run test
npm -w client run test:run
```
