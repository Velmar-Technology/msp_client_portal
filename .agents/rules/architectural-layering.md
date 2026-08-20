# Architectural Layering & Clean Architecture Rules

## 1. Client-Side 4-Level Architectural Layering

$$\text{Level 1: Primitives (/components/ui)} \longleftarrow \text{Level 2: Shared Blocks (/components/shared)} \longleftarrow \text{Level 3: Feature Components (/components/[domain])} \longleftarrow \text{Level 4: Views/Pages (/pages, /routes)}$$

### Level 1: Primitives (`client/src/components/ui/`)
- **Role**: Pure presentation components (shadcn/ui base primitives: Button, Dialog, Input, Badge, Table, etc.).
- **Boundary**: Zero awareness of database, API contracts, services, stores, feature components, or pages.
- **Enforcement**: Strictly cannot import from `@/components/shared`, `@/components/[domain]`, `@/pages`, `@/routes`, `@/services`, or `@/store`.

### Level 2: Shared Blocks (`client/src/components/shared/`, `client/src/components/layout/`)
- **Role**: Reusable macro UI patterns that remain strictly domain-agnostic (`Page`, `MaxWidthWrapper`, `StatsGrid`, `Breadcrumbs`, `ThemeToggle`, `NotificationBell`).
- **Boundary**: Accepts generic props and slots instead of domain entities.
- **Enforcement**: Strictly cannot import from `@/components/[domain]`, `@/pages`, or `@/routes`.

### Level 3: Feature Components (`client/src/components/[domain]/`, `client/src/features/[domain]/`)
- **Role**: Domain-aware components tied to business rules, API models, and backend actions (`<NewTicketModal/>`, `<BillingSheet/>`, `<DeviceTable/>`).
- **Boundary**: Ingests domain data types and handles local domain interactions.
- **Enforcement**: Strictly cannot import from `@/pages` or `@/routes`. Must not import directly from peer feature module internals; interact only through shared services or public hooks.

### Level 4: Views & Pages (`client/src/pages/`, `client/src/routes/`)
- **Role**: Route-level orchestrators.
- **Boundary**: Handles route parameters, URL query syncing (`useUrlState`), and composes Level 3 Feature components alongside Level 2 Page layouts.

---

## 2. Server-Side Clean Architecture & Dependency Rule

```
[ Frameworks & Drivers (DB, Express, Routes) ]
            │
            ▼
[ Interface Adapters (Controllers, Repositories) ]
            │
            ▼
[ Use Cases (Services: TicketService, InvoiceService) ]
            │
            ▼
[ Entities (Domain Types & Business Rules) ]
```

1. **Entities (`server/src/shared/types/`)**: Pure domain types without outward dependencies on Express or ORM schemas.
2. **Services (`server/src/modules/<domain>/services/`)**: Business logic use cases with constructor dependency injection. Cannot import Express (`Request`, `Response`) or raw DB connection pool (`@shared/db`). All data access flows through injected repositories.
3. **Controllers (`server/src/modules/<domain>/controllers/`)**: HTTP adapters parsing requests and invoking services. Cannot import repositories or `@shared/db` directly. Rely on Express 5 native async error propagation.
4. **Repositories (`server/src/modules/<domain>/repositories/`)**: Data access adapters translating Drizzle ORM queries into domain entities.
5. **Module Gateways (`server/src/modules/<domain>/index.ts`)**: Bounded contexts expose public services/hooks via `index.ts`. Cross-module imports must only consume what is exported by the module gateway.
