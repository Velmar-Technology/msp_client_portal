# Architectural Layering & Clean Architecture Rules

## 1. Client-Side 4-Level Architectural Layering

$$\text{Level 1: Primitives (/components/ui)} \longleftarrow \text{Level 2: Shared Blocks (/components/shared)} \longleftarrow \text{Level 3: Feature Components (/components/[domain])} \longleftarrow \text{Level 4: Views/Pages (/pages, /routes)}$$

### Level 1: Primitives (`client/src/components/ui/`)
- **Role**: Pure presentation components (shadcn/ui base primitives: Button, Dialog, Input, Badge, Table, Sheet, AlertDialog, DropdownMenu, Skeleton, etc.).
- **Boundary**: Zero awareness of database, API contracts, services, stores, feature components, or pages.
- **Enforcement**: Strictly cannot import from `@/components/shared`, `@/components/[domain]`, `@/pages`, `@/routes`, `@/services`, or `@/store`.
- **Mandatory UI Rule**: All UI elements MUST strictly use `shadcn/ui` components from `client/src/components/ui/`. Raw unstyled HTML primitives (`<button>`, `<input>`, `<select>`, `<dialog>`) are strictly forbidden.

### Level 2: Shared Blocks (`client/src/components/shared/`, `client/src/components/layout/`)
- **Role**: Reusable macro UI patterns and layout frames that remain strictly domain-agnostic (`Page`, `MaxWidthWrapper`, `StatsGrid`, `Breadcrumbs`, `ThemeToggle`, `NotificationBell`, `AppLayout`, `TopNav`, `AppSidebar`).
- **Boundary**: Accepts generic props and slots instead of domain entities.
- **Enforcement**: Strictly cannot import from `@/components/[domain]`, `@/features/[domain]`, `@/pages`, or `@/routes`.

### Level 3: Feature Components (`client/src/components/[domain]/`, `client/src/features/[domain]/`)
- **Role**: Domain-aware components tied to business rules, API models, and backend actions (`<NewTicketModal/>`, `<BillingSheet/>`, `<DeviceTable/>`, `<TicketTimeline/>`, `<CheckoutSheet/>`).
- **Boundary**: Ingests domain data types and handles local domain interactions.
- **Enforcement**: Strictly cannot import from `@/pages` or `@/routes`.
- **Feature Isolation**: Peer feature modules MUST NEVER import directly from inside another feature module's internal files; cross-domain UI interactions must go through explicit shared services, shared components, or public hooks.

### Level 4: Views & Pages (`client/src/pages/`, `client/src/routes/`)
- **Role**: Route-level orchestrators.
- **Boundary**: Handles route parameters, URL query syncing (`useUrlState`), and composes Level 3 Feature components alongside Level 2 Page layouts and layout shells.

### Client-Side Quality & State Standards
- **Zod Form Validation**: All client forms and modal submission dialogs MUST strictly validate input using Zod schemas (`schema.safeParse(...)`) mirroring backend DTO constraints (`@shared/dtos`).
- **i18n Localization**: NO user-facing UI text, headers, badges, tooltips, or table headers may be hardcoded. All strings MUST use `useTranslation()` (`t("namespace.key")`) from `react-i18next` with keys defined in both `en_US.json` and `es_DO.json`. Language-detection hacks (inspecting `t()` output) are forbidden.
- **Deep Link & URL State**: All tab views (`?tab=...`), table filters (`?status=...`, `?search=...`), and modal overlays (`?openModal=...`) MUST sync with URL search parameters via `useUrlState`.

---

## 2. Client Performance & Dynamic Loading Architecture

### Dynamic Route & Chunk Splitting (`lazyWithRetry`)
- All top-level route pages in `client/src/routes/` and `client/src/protected-routes.tsx` MUST be dynamically imported using `lazyWithRetry` from `@/lib/lazyWithRetry`.
- Dynamic imports include automatic exponential backoff retries and session-guarded reload fallbacks for deployment chunk hash invalidations.
- Heavy non-critical feature components (charts, complex modals, heavy tabs) must be lazily loaded.

### Localized Skeletons & Suspense Boundaries
- Zero fullscreen generic blocking spinners.
- Every lazy route MUST be wrapped in `<RouteSuspenseWrapper fallback={<MatchingSkeleton />}>` using domain-specific skeletons from `client/src/components/skeletons/` (`DashboardSkeleton`, `TablePageSkeleton`, `DetailSkeleton`, `ContentPageSkeleton`).
- Each async chunk is shielded by an isolated `ChunkErrorBoundary`.
- Loading gates use `useDeferredLoading(loading, SKELETON_DISPLAY_DELAY_MS)` to prevent skeleton flash on fast responses.

### Intent & Idle Preloading
- Navigation elements (`AppSidebar`, `TopNav`) trigger `preloadRoute(to)` on `onMouseEnter` and `onFocus`.
- Secondary route chunks are preloaded during idle browser time via `preloadOnIdle` (`requestIdleCallback`).

---

## 3. Server-Side Clean Architecture & Modular Monolith

```
[ Frameworks & Drivers (DB Pool, Express, External Drivers) ]
                            │
                            ▼
[ Interface Adapters (Controllers, Repositories) ]
                            │
                            ▼
[ Use Cases (Services: TicketService, InvoiceService, AuthService) ]
                            │
                            ▼
[ Entities (Domain Types & Business Rules) ]
```

### Layer Mapping & Responsibilities

1. **Entities Layer (`server/src/shared/types/`, `server/src/shared/db/schema/`)**:
   - Contains pure domain interfaces (`Ticket`, `User`, `Subscription`, `Invoice`, `Equipment`), status enums (`TicketStatus`, `UserRole`, `SubscriptionStatus`), and Drizzle schema table definitions.
   - **Rule**: Pure domain types have zero outward dependencies on Express or ORM query drivers.

2. **Use Cases / Service Layer (`server/src/modules/<domain>/services/`)**:
   - Houses application business logic: ticket quota validation, SLA cancellation rules, technician dispatch, subscription true-ups, renewal calculations, payment handling, and health scoring.
   - **Rule**: Every service MUST use constructor dependency injection with default singleton dependencies (e.g. `constructor(private userRepo: UserRepository = userRepository)`).
   - **Forbidden**: Direct imports of Express objects (`Request`, `Response`), database pool (`@shared/db`), controllers, or route handlers.

3. **Interface Adapters (`server/src/modules/<domain>/controllers/`, `server/src/modules/<domain>/repositories/`)**:
   - **Controllers**: Translate incoming HTTP requests into service inputs and format service outputs. Must NEVER import repositories or `@shared/db` directly; all data access flows through the service layer.
   - **Repositories**: Translate Drizzle ORM queries into typed domain objects. Extend `BaseRepository` where applicable. Must not contain business logic or circular service dependencies.

4. **Frameworks & Drivers (`server/src/modules/<domain>/routes/`, `server/src/shared/db/`, `server/src/shared/utils/`)**:
   - Express router bindings, database connection pool (`db.ts`), email/WhatsApp utility drivers, PDF generation.
   - Framework-specific drivers and persistence code are confined here and never leaked into domain services.

5. **API Gateway Layer (`server/src/shared/middleware/gateway*.ts`)**:
   - Ingress handling for downstream route clusters:
     - **Auth Header Injection**: Decodes JWT/session tokens and injects standardized `X-User-Id` and `X-Tenant-Id` headers into request context.
     - **Multi-Tenant Rate Limiting**: Enforces per-tenant sliding window request limits (429 `RateLimitError`).
     - **Cluster Path Routing**: Routes public API path clusters while maintaining header propagation.

---

## 4. Feature Module Internal Anatomy & Public Gateway Contract

Each domain module in `server/src/modules/<domain>/` is an autonomous bounded context:

```text
server/src/modules/<feature>/
├── routes/                # [feature].routes.ts: HTTP route definitions & middleware
├── controllers/           # [Feature]Controller.ts: HTTP request translation
├── services/              # [Feature]Service.ts: Business rules & validations
├── repositories/          # [Feature]Repository.ts: Database queries & persistence
├── models/                # [feature].model.ts / schema: DTOs, schemas & module types
└── index.ts               # The Public API / Gateway for this feature module
```

### Module Gateway Rules (`index.ts`):
1. **Public API Contract**: `index.ts` is the single public gateway for the module. Other modules MUST only consume services, types, or event hooks explicitly re-exported by `index.ts`.
2. **Forbidden Cross-Module Imports**: Importing internal repositories, controllers, or raw ORM schemas directly from another module (e.g. `import { TicketRepository } from '@modules/tickets/repositories/TicketRepository'`) is strictly **FORBIDDEN**.
3. **Domain Encapsulation**: Private helpers, repository queries, and internal models remain private to the module.

---

## 5. Domain Error Hierarchy & Express 5 Async Error Handling

All backend code MUST adhere to the standardized error system in `@shared/errors`:

| Error Class | Status Code | Error Code (`code`) | Inheritance / Base | Typical Use Case |
| :--- | :---: | :--- | :--- | :--- |
| **`ValidationError`** | 400 | `VALIDATION_ERROR` | `AppError` | Payload / schema / input validation failures |
| **`NotFoundError`** | 404 | `NOT_FOUND_ERROR` | `AppError` | Missing entities (tickets, users, invoices, slots) |
| **`UnauthorizedError`** | 401 | `UNAUTHORIZED_ERROR` | `AppError` | Missing/invalid authentication token or session |
| **`ForbiddenError`** | 403 | `FORBIDDEN_ERROR` | `AppError` | RBAC violations, unauthorized tenant access |
| **`ConflictError`** | 409 | `CONFLICT_ERROR` | `AppError` | Unique constraints, duplicate records |
| **`InternalServerError`** | 500 | `INTERNAL_SERVER_ERROR` | `AppError` | Unhandled non-operational system failures |
| **`RateLimitError`** | 429 | `RATE_LIMIT_EXCEEDED` | `AppError` | Tenant / IP rate limiting exceeded |
| **`ExternalServiceError`** | 502 | `EXTERNAL_SERVICE_ERROR` | `AppError` | External third-party failure (Nextcloud, PayPal, etc.) |
| **`SlaViolationError`** | 403 | `SLA_VIOLATION` | `ForbiddenError` | Ticket cancellation attempted outside 60-min SLA |
| **`TicketLimitExceededError`** | 403 | `TICKET_LIMIT_EXCEEDED` | `ForbiddenError` | Client / device quota exceeded |
| **`InvalidTransitionError`** | 400 | `INVALID_STATUS_TRANSITION` | `ValidationError` | Disallowed state machine transition |
| **`InvalidFileTypeError`** | 400 | `INVALID_FILE_TYPE` | `ValidationError` | Disallowed file MIME type or extension |

### Mandatory Error Handling Rules:
1. **Direct Class Instantiation**: Always throw specific typed domain errors (`throw new NotFoundError(...)`). Deprecated `AppError.badRequest()` factories are forbidden.
2. **No Raw Errors**: Never throw raw untyped `new Error('...')` or strings in services/controllers.
3. **No Inline HTTP Error Responses**: Controllers must never return `res.status(400).json(...)`. Always throw typed domain errors and let the global error middleware format responses.
4. **Express 5 Native Async Rejection**: Rely on Express 5 native async error propagation. Do NOT write `try { ... } catch (err) { next(err); }` boilerplate in controllers.

---

## 6. Model Context Protocol (MCP) Integration Infrastructure

The development environment and runtime orchestration integrate directly with dedicated MCP servers:

| MCP Server | Protocol / Mode | Primary Purpose & Architectural Integration |
| :--- | :--- | :--- |
| **`packages/mcp-server`** | Internal MCP Server | Dedicated MSP automation tools (`ticketTools`, `equipmentTools`, `rmmTools`, `securityTools`, `remediationTools`, `localHostTools`). |
| **`context7`** | Remote HTTP | Live documentation lookup for third-party libraries, APIs, SDKs, and framework version migrations. |
| **`shadcn`** | MCP Tooling | UI component registry search, item preview, and component installation for `client/src/components/ui/` primitives. |
| **`stitch`** | Remote HTTP | Google Stitch UI design system generation, screen wireframes, and design token application. |
| **`paypal`** | Sandbox CLI | PayPal sandbox invoicing, order creation, payment capture, and recurring billing testing (`modules/billing`). |
| **`postgres`** | DB Adapter | Direct PostgreSQL query execution, schema inspection, and verification across multi-tenant tables. |
| **`chrome-devtools`** | Headless Chrome | Automated browser testing, DOM verification, performance tracing, network request monitoring, and visual snapshots. |
| **`sequential-thinking`** | Cognitive Tool | Dynamic multi-step reasoning, architectural analysis, and complex refactoring plans. |
| **`memory`** | Graph DB | Persistent project observations, relations, and entity graph tracking. |
