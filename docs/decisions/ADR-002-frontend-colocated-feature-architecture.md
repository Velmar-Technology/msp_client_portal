# ADR-002: Frontend Colocated Feature Folder Architecture

## Status
Accepted

## Date
2026-09-02

## Context
In [ADR-001](ADR-001-contract-first-monolith-and-tanstack-query.md), we established a Contract-First Monolith and delegated all asynchronous server data to TanStack Query. 

However, in the frontend (`client/src`), code was historically organized by technical role rather than business domain:
* `client/src/components/<domain>/` (UI blocks and dialogs)
* `client/src/pages/<Domain>Page/` (Route page components)
* `client/src/hooks/queries/` (TanStack Query hooks)
* `client/src/hooks/<domain>/` (Page orchestrators and filter logic)
* `client/src/services/` (Axios API calls and manual interface definitions)

As the MSP portal expands to cover complex multi-tenant enterprise domains (Tickets, Hardware Equipment, Subscriptions, Billing & Invoicing, CRM Lead Pipelines, and RMM Telemetry), this flat horizontal layering introduces friction:
1. **High Cognitive Load & Context Switching:** Modifying a single feature requires navigating across 5 disparate folders in `client/src/`.
2. **Coupling and Leaky Abstractions:** When features share internal components ad-hoc across horizontal directories, refactoring or removing a capability risks cascading regressions.
3. **Type Duplication Risk:** Engineers unfamiliar with the contract-first architecture risk writing local TypeScript interfaces in `client/src/services/` or `client/src/types/`, reintroducing drift from backend schemas.

We need a standardized frontend architecture modeled after battle-tested enterprise SaaS applications (Linear, Supabase, Bulletproof React) that groups files by business capability while preserving strict layer boundaries and zero duplicate types.

---

## Decision

We adopt the **Colocated Feature Folder Architecture** (`client/src/features/<feature>/`) for the frontend:

### 1. Feature Directory Layout

Every business domain in `client/src/features/<domain>/` is structured as a self-contained vertical module:

```
client/src/features/<domain>/
├── api/
│   ├── use<Domain>Queries.ts   # TanStack Query hooks, query keys, and mutations
│   └── <domain>Service.ts      # Axios client service (or direct contract consumer)
├── components/
│   ├── <Domain>Table.tsx       # Feature-specific tables and data grids
│   ├── <Domain>Card.tsx        # Feature-specific cards or widgets
│   └── <Action>Modal.tsx       # Feature-specific dialogs and drawer forms
├── hooks/
│   ├── use<Domain>Filters.ts   # URL search param synchronization (useUrlState)
│   └── use<Domain>Modals.ts    # Ephemeral modal open/close handlers
├── pages/
│   ├── <Domain>Page.tsx        # Top-level route component
│   └── <Domain>DetailPage.tsx  # Detailed single-item view route component
├── types.ts                    # ONLY local, ephemeral UI state types (no backend entity types!)
└── index.ts                    # Public API gateway exporting only authorized components & hooks
```

---

### 2. The Invariant Rules of Colocated Features

#### Rule 1: The Single Contract Truth Invariant (Ban on Local Entity Types)
* **Entities, inputs, filters, and API response types MUST be imported directly from `@shared/contracts`.**
* `types.ts` inside a feature directory is **STRICTLY FORBIDDEN** from declaring or duplicating backend entities (e.g., `interface Ticket { id: string; ... }`).
* `types.ts` is reserved exclusively for **ephemeral UI state** that does not exist on the server (e.g., `type ActiveTab = 'overview' | 'audit_log'`, `type StepperIndex = 1 | 2 | 3`).

#### Rule 2: Module Gateway & Public API Boundary (`index.ts`)
* Every feature folder exposes its public interface strictly via `features/<domain>/index.ts`.
* Cross-feature imports MUST point to the feature root (e.g., `import { useEquipmentSelect } from '@/features/equipment';`).
* **Deep imports into another feature's internal directories (e.g., `import ... from '@/features/equipment/components/InternalSlotRow'`) are FORBIDDEN.**

#### Rule 3: Centralized Core & Shared Primitives
Code that is truly generic across the entire application remains outside `features/`:
* `client/src/components/ui/`: Primitive elements (`shadcn/ui` / Radix: Button, Dialog, Input, Select, Badge, Card, Table).
* `client/src/components/shared/`: Cross-domain reusable components (`<Page>`, `<ChunkErrorBoundary>`, `<FeatureRouteGuard>`, `<FeatureLockedPreview>`, localized skeletons).
* `client/src/lib/`: Shared utilities (`cn`, `api`, `authStorage`, `lazyWithRetry`).
* `client/src/store/`: Global ephemeral UI state (Zustand: auth session, theme preference, active tenant switcher).

#### Rule 4: URL State Synchronization for Navigation
* All page sub-views (`?tab=...`), table filters (`?status=...`, `?search=...`), pagination (`?page=...`, `?limit=...`), and drawers (`?inspectId=...`) MUST synchronize via `useUrlState` or `useSearchParams`.
* Storing shareable navigation state in React `useState` is an antipattern.

#### Rule 5: Form Validation via `@hookform/resolvers/zod`
* All mutation forms use `react-hook-form` paired with `zodResolver(Create<Entity>InputSchema)` imported from `@shared/contracts`.
* Frontend forms validate using the exact same schema enforced by the backend Express route.

---

## Consequences

### Positive
* **10x Navigability:** All components, queries, modals, and route pages for a business domain live in a single folder.
* **Trivial Refactoring & Deletion:** Retiring or migrating a feature involves deleting or moving one folder, with zero orphaned files scattered across 5 directories.
* **Elimination of Type Drift:** Enforcing `@shared/contracts` as the only source of entity types guarantees compile-time safety across the full stack.
* **Clear Team Ownership:** Engineers can work on distinct features without colliding in shared horizontal `components/` or `hooks/` directories.

### Negative / Trade-offs
* **Migration Overhead:** Existing pages in `client/src/pages/` and `client/src/components/` need to be migrated into `features/`.
* **Discipline on Boundaries:** Requires automated linting or agent rules to prevent unauthorized cross-feature deep imports.

---

## Migration Strategy & Implementation Status

All 12 business domains have completed migration into `client/src/features/` with 100% test coverage and AST architectural enforcement:

| Feature Module | Directory | Status | Gateway / Public Exports |
| :--- | :--- | :--- | :--- |
| **Auth** | `client/src/features/auth/` | **Complete** | `LoginPage`, `RegisterPage`, `authService`, `useAuthQueries` |
| **Billing** | `client/src/features/billing/` | **Complete** | `BillingPage`, `invoiceService`, `useBillingQueries`, `PayModal`, `useBilling` |
| **CRM** | `client/src/features/crm/` | **Complete** | `CRMPage`, `CRMCustomPlanPage`, `crmService`, `useCrmQueries`, `CrmKanbanView` |
| **Dashboard** | `client/src/features/dashboard/` | **Complete** | `DashboardPage`, `TechDashboardPage`, `useDashboardQueries`, `AdminDashboardView` |
| **Equipment** | `client/src/features/equipment/` | **Complete** | `DevicesPage`, `equipmentService`, `useEquipmentQueries`, `RmmDeviceTable` |
| **Financial** | `client/src/features/financial/` | **Complete** | `FinancialPage`, `earningsService`, `expenseService`, `useFinancialQueries` |
| **RMM** | `client/src/features/rmm/` | **Complete** | `MaintenancePage`, `rmmService`, `maintenanceService`, `useRmmQueries` |
| **Settings** | `client/src/features/settings/` | **Complete** | `ProfilePage`, `NotificationPreferencesPage`, `PasswordManagerPage`, `notificationService` |
| **Subscriptions** | `client/src/features/subscriptions/` | **Complete** | `PlansPage`, `PlanEditorPage`, `subscriptionService`, `planService`, `useSubscriptionQueries` |
| **System** | `client/src/features/system/` | **Complete** | `ApiStatusPage`, `systemService`, `useSystemQueries`, `useApiStatus` |
| **Tickets** | `client/src/features/tickets/` | **Complete** | `TicketsPage`, `TicketDetailPage`, `ticketService`, `useTicketQueries`, `NewTicketModal` |
| **Users** | `client/src/features/users/` | **Complete** | `UserManagementPage`, `userService`, `useUsersQueries`, `UserRoleBadge` |

---

## Automated Invariant Enforcement

To ensure boundary compliance and zero regression back to horizontal anti-patterns, the test suite `client/tests/arch/feature-architecture.test.ts` executes in under 300ms on every commit and CI run:
1. **Public Gateway Invariant:** Asserts non-empty `index.ts` on every feature directory.
2. **Deep Import Prohibition:** Uses TypeScript AST parsing to block any import referencing feature internals (`@/features/<domain>/components/...`, `@/features/<domain>/api/...`, or relative peer directory paths).
3. **Single Contract Truth:** Uses AST analysis on all `types.ts` files to reject backend entity declarations or schema re-declarations.
4. **Purged Legacy Guard:** Fails if any legacy horizontal paths (`client/src/pages/`, `client/src/services/`, etc.) are recreated.
