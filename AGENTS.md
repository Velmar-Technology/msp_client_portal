# System Rules, Clean Architecture & Code Quality Guidelines

## 📌 Executive Summary

The **MSP Client Portal** (`msp_client_portal`) is a multi-tenant Managed Service Provider software platform designed to manage helpdesk support tickets, technician dispatch, device/equipment inventories, client subscription plans, recurring invoicing, cloud backups, scheduled maintenance operations, and CRM sales pipelines.

Architecturally, the application is structured as a **Modular Monolith** (PERN Stack: PostgreSQL, Express, React, Node.js with Drizzle ORM and Vite/Tailwind v4) housed in a workspace monorepo. The backend codebase is strictly partitioned into self-contained domain modules (`modules/auth`, `modules/tickets`, `modules/billing`, `modules/subscriptions`, `modules/rmm`, `modules/equipment`, `modules/notifications`, `modules/system`, `modules/crm`) alongside shared infrastructure (`shared/`) and standalone packages (`packages/errors`, `packages/mcp-server`). Each module encapsulates its own controllers, services, repositories, models, and routes while adhering to **Uncle Bob’s Clean Architecture & Clean Code principles**: the Dependency Rule is enforced within modules, services rely on constructor-injected dependencies, and all data access flows through module repositories.

This document serves as the master specification, architectural health report, and boundary enforcement guide for all human developers and AI agents operating on this codebase.

---

## 🏗️ Architecture & Dependency Rule Compliance

Clean Architecture mandates that source code dependencies must strictly point **INWARD** toward high-level policy and domain entities:

```
[ Frameworks & Drivers (DB Pool, Express, External Drivers) ]
                            │
                            ▼
[ Interface Adapters (Controllers, Repositories) ]
                            │
                            ▼
[ Use Cases (Services: TicketCreationService, InvoicePaymentService, AuthService) ]
                            │
                            ▼
[ Entities (Domain Types & Business Rules) ]
```

### Layer Mapping & Status

1. **Entities Layer (`server/src/shared/types/`, `server/src/shared/db/schema/`)**:
   - Contains domain interfaces (`Ticket`, `User`, `Subscription`, `Invoice`, `Equipment`, `Deal`, `Lead`), status enums (`TicketStatus`, `UserRole`, `SubscriptionStatus`), Drizzle schema table definitions, and cross-cutting port abstractions (e.g., `CachePort` for the tiered cache).
   - _Compliance_: Pure domain types and ports have no outward dependencies.

2. **Use Cases / Service Layer (`server/src/modules/<domain>/services/`)**:
   - Houses application business logic: ticket quota validation, 1-hour SLA cancellation enforcement, technician round-robin allocation, subscription renewal calculations, payment handling, and lead/deal pipelines.
   - _Compliance_: Every service exposes constructor injection with default singleton dependencies (e.g., `constructor(private userRepo: UserRepository = userRepository)`), so high-level use cases do not hard-couple to concrete singletons. `AssignmentService` and its strategies access the database exclusively through `RoundRobinRepository`, `TicketRepository`, and `UserRepository` — no service imports `db` directly.

3. **Interface Adapters (`server/src/modules/<domain>/controllers/`, `server/src/modules/<domain>/repositories/`, `client/src/services/`)**:
   - Controllers translate HTTP requests/responses into service inputs/outputs. Repositories translate Drizzle ORM queries into typed domain objects.
   - _Compliance_: No controller imports a repository or the `db` pool directly; all data access flows through the service layer.

4. **Frameworks & Drivers (`server/src/modules/<domain>/routes/`, `server/src/shared/db/`, `client/src/components/`)**:
   - Contains Express routes, database connection pool (`db.ts`), email/WhatsApp utility drivers, the tiered cache infrastructure (`server/src/shared/utils/cache/` — Redis with in-memory LRU fallback, generation-based invalidation, and `DistributedLock`), and React UI components.
   - _Compliance_: Framework-specific code (Drizzle ORM access, static bank account data) is confined to `server/src/shared/db/`, module repositories, and `client/src/constants/` — it does not leak into domain services or UI feature components. The cache is a framework/driver concern consumed through the `CachePort` abstraction; it is injected into repositories/services via their constructors and wired as a singleton (`cacheManager`) in each module's gateway (`index.ts`).

5. **The API Gateway Layer (`server/src/shared/middleware/gateway*.ts`)**:
   - Sits in front of downstream route clusters to handle global ingress logic uniformly:
     - **Authentication Header Injection**: Decodes incoming JWT / session tokens at the entry point and injects standardized `X-User-Id` and `X-Tenant-Id` headers into downstream request context.
     - **Multi-Tenant Rate Limiting**: Protects downstream services from noisy neighbors by enforcing per-tenant (`X-Tenant-Id`) sliding window request limits (1000 req/15 min default, configurable via `RATE_LIMIT_MAX_REQUESTS`) and returning HTTP 429 (`TOO_MANY_REQUESTS`).
     - **Cluster Path Routing**: Directs public path clusters (`/api/v1/billing/*`, `/api/v1/workspaces/*`, `/api/v1/tickets/*`, `/api/v1/auth/*`, `/api/v1/crm/*`) to internal handlers while maintaining header propagation.

---

## 🛠️ Master Business Logic Specification (v2.0)

```
                       ┌──────────────────────────────┐
                       │  MSP Core Logic Architecture │
                       └──────────────┬───────────────┘
                                      │
  ┌───────────────┬───────────────┼───────────────┬───────────────┬───────────────┐
  ▼               ▼               ▼               ▼               ▼               ▼
1. Support &    2. Subscriptions 3. Access Control 4. Billing      5. CRM & Sales  6. Account Health
   Escalation      & Licensing      & State Machine  Automation       Pipeline        (Roadmap)
```

### Module 1: Support, Routing & Escalation Engine

- **BL-101: 1-Hour SLA Cancellation Rule** (`TicketAccessPolicy.enforceSLARule`, invoked via `TicketStatusService`)
  - **Condition**: Tickets in `WARRANTY` or `SERVICE_OUTAGE` categories can only be cancelled within 60 minutes ($\text{SLA\_WINDOW\_MS} = 3,600,000$) of creation.
  - **Enforcement**: Late cancellation attempts throw `SlaViolationError`.
- **BL-102: Round-Robin Dispatch with Specialty Fallback** (`AssignmentService.getNextTechnician`)
  - **Condition**: Distributes tickets equitably per category.
  - **Fallback Chain**: Active Specialists $\rightarrow$ General Active Technician Pool.
- **BL-103: Alert Noise Reduction & Auto-Remediation** (`AlertService.processRMMAlert`)
  - **Condition**: RMM alerts occurring within a 15-minute window for the same asset are deduplicated into a single parent ticket.
  - **Self-Healing**: Automated scripts that resolve issues within $300\text{ seconds}$ auto-close the ticket as `RESOLVED_AUTOMATED` without dispatcher intervention.
  - **Flapping Override** (Rule 1.1): Alerts that trigger $\ge 3$ times for the same `(alertType, assetId)` within a rolling 24-hour window bypass auto-close, open a `PREVENTATIVE_MAINTENANCE` ticket tagged `[FLAPPING_ALERT]`, and route directly to Tier 2.
- **BL-104: Time-Based Tier Escalation** (`EscalationService.enforceEscalation`, `EscalationScheduler`)
  - **Condition** (Rule 1.2): An OPEN, unworked ticket (unassigned or without responses) escalates to a Tier 2 specialist once its priority threshold is exceeded: CRITICAL = 10m, HIGH = 20m, MEDIUM = 45m, LOW = 120m.
  - **Routing** (Rule 1.3): `CapacityWeightedAssignmentStrategy` routes to the technician minimizing weighted open load ($\text{P1}=4.0$, $\text{P2}=2.0$, $\text{P3}=1.0$, $\text{P4}=0.5$), falling back to the general active pool when all specialists exceed a 15.0 capacity threshold.
- **KPIs (Rule 1.4)**:
  - $NRR = \frac{TotalAlerts - HumanTouchTickets}{TotalAlerts}$ (Noise Reduction Ratio).
  - $SHE = \frac{AutoClosed}{AutoClosed + FlappingOverrides}$ (Self-Healing Efficiency).
  - $FCR_A = \frac{AutomatedResolved}{TotalTicketsIngested}$ (Automated First Contact Resolution).

### Module 2: Subscriptions, Licensing & True-Ups

- **BL-201: Plan Feature Quota Rule** (`TicketQuotaService.enforceTicketLimit`, `TicketCreationService`)
  - **Condition**: Validates client subscription feature caps (`HELPDESK_SUPPORT`).
  - **Enforcement**: Blocks ticket creation with `TicketLimitExceededError` once thresholds (e.g., 5 tickets/device/month or 10 tickets/account/month) are reached.
- **BL-202: Automated License True-Up & Scaling** *(Domain Roadmap Specification)*
  - **Condition**: Nightly job reconciles cloud user seats (e.g., M365/Azure AD) and active RMM agents against active client contracts.
  - **Action**: Automatically updates billable quantity ($Q_{\text{billed}}$) for the next billing run if active count exceeds contracted baseline ($Q_{\text{contracted}}$).
- **BL-203: Out-of-Scope Project Guardrails** *(Domain Roadmap Specification)*
  - **Condition**: Requests outside the active contract scope (e.g., new site setups, hardware moves) require client authorization and shift to `PENDING_ESTIMATE` before work begins.

### Module 3: Access Control & State Machine

- **BL-301: Strict Ticket State Machine & Access Isolation** (`TicketStatusService.updateTicketStatus`, `TicketQueryService.getTickets`, `TicketAccessPolicy`)
  - **Validation**: All status changes must pass the defined `STATUS_TRANSITIONS` matrix (invalid attempts throw `InvalidTransitionError`).
  - **RBAC Scoping Rules**:
    - **Clients**: Strict multi-tenant isolation by `tenant_id`. Status transitions restricted to `CANCELLED`.
    - **Technicians**: View/modify permissions restricted to explicitly assigned tickets.
    - **Admins**: Global access across all tenants, tickets, and configurations.

### Module 4: Billing Automation & Invoicing Lifecycle

- **BL-401: Automatic Subscription Reactivation** (`InvoicePaymentService.capturePaypalOrder`, `InvoicePaymentService.markAsPaid`)
  - **Trigger**: Successful PayPal order capture or manual invoice flag set to `PAID`.
  - **Action**: Instantly updates all `EXPIRED` client subscriptions to `ACTIVE` and broadcasts in-app notifications to both the client and all administrators.
- **BL-402: Recurring Renewal Scheduler** (`SubscriptionScheduler.processSubscriptions`, `SubscriptionRenewalService`)
  - **Execution**: Background process running on set cron schedule.
  - **Workflow**: Scans active subscriptions $\rightarrow$ checks expiry dates $\rightarrow$ calculates hardware multipliers ($M_{\text{equip}}$) $\rightarrow$ creates recurring PostgreSQL invoices $\rightarrow$ dispatches billing emails via `sendInvoiceDueEmail`.
- **BL-403: Manual Wire Transfer & Offline Payment Validation** (`InvoicePaymentService.markAsPaid`)
  - **Trigger / Authorization**: Admin user (`UserRole.ADMIN`) validates manual wire transfer or bank transfer payment.
  - **Action**: Updates invoice status to `PAID` without PayPal API dependency, reactivates linked `EXPIRED` client subscriptions to `ACTIVE`, and dispatches in-app notifications to both the client and all administrators.

### Module 5: CRM & Sales Pipeline Engine

- **BL-501: CRM Pipeline & Lead Conversion** (`CRMService`, `DealService`, `LeadService`)
  - **Condition**: Tracks sales prospects through structured lifecycle stages (`NEW` $\rightarrow$ `QUALIFIED` $\rightarrow$ `PROPOSAL` $\rightarrow$ `NEGOTIATION` $\rightarrow$ `WON` / `LOST`).
  - **Action**: Converting a `WON` deal automatically links into client tenant creation and subscription provisioning.

### Module 6: Account Health & QBR Logic *(Domain Roadmap Specification)*

- **BL-601: Composite Client Health Scoring**
  - **Formula**:
    $$H = 0.40 \times S_{\text{ticket}} + 0.30 \times S_{\text{hardware}} + 0.30 \times S_{\text{security}}$$
  - **Action**: Accounts scoring below $70\%$ trigger an automated task for the vCIO to schedule a Quarterly Business Review (QBR) and review contract margins.

---

## 🔄 Core Data Journeys & State Changes (Command-Query Separation)

### Journey 1: Ticket Creation & Round-Robin Auto-Assignment

1. **Triggers/Inputs**: Client submits `CreateTicketInput` payload (`title`, `description`, `category`, `priority`, optional `equipmentId`) via `POST /api/v1/tickets` with JWT credentials.
2. **Execution (Command vs Query)**:
   - _Query / Validation_: `ticketQuotaService.enforceTicketLimit` checks active client subscriptions (`subscriptionRepository.findByClient`) and queries monthly ticket count (`ticketRepository.countClientTicketsInCurrentMonth` or `countEquipmentTicketsInCurrentMonth`).
   - _Command (Mutation)_: `ticketRepository.create` inserts a new ticket record into PostgreSQL with `OPEN` status.
   - _Command (Mutation)_: `ticketEventRepository.create` records a creation audit event (`OPEN`, changed_by: `clientId`).
   - _Command (Mutation)_: `assignmentService.getNextTechnician(category)` calculates next technician and updates `round_robin_state` table.
   - _Command (Mutation)_: `ticketRepository.assignTechnician` updates `assigned_tech_id` on the ticket record.
   - _Side Effect (Query + Notification)_: `userRepository.findById` queries client user; `sendTicketCreatedEmail` and `notificationService.createInAppNotification` send notifications.
3. **Outputs & DB Side Effects**:
   - `tickets` table: Record inserted with `OPEN` status and assigned technician ID.
   - `ticket_events` table: Creation event logged.
   - `round_robin_state` table: `last_assigned_tech_id` updated for category.
   - HTTP 201 response returned with created ticket payload.

### Journey 2: Ticket Cancellation & 1-Hour SLA Validation

1. **Triggers/Inputs**: Client sends `UpdateTicketStatusInput` payload `{ status: "CANCELLED", notes: "Resolved self" }` via `PATCH /api/v1/tickets/:id/status`.
2. **Execution (Command vs Query)**:
   - _Query_: `ticketRepository.findById(ticketId)` fetches current ticket record.
   - _Validation_: Verifies tenant matching (`ticket.tenant_id === tenantId`) and client ownership (`ticket.client_id === userId`).
   - _Validation_: Verifies transition matrix (`STATUS_TRANSITIONS[ticket.status]`).
   - _Query / SLA Validation_: If category is `WARRANTY` or `SERVICE_OUTAGE`, `ticketAccessPolicy.enforceSLARule` compares `Date.now() - ticket.created_at` against `SLA_WINDOW_MS` (1 hour). Throws `SlaViolationError` if elapsed time > 60 minutes.
   - _Command (Mutation)_: `ticketRepository.updateStatus(ticketId, 'CANCELLED')`.
   - _Command (Mutation)_: `ticketEventRepository.create` logs transition event.
   - _Side Effect_: `notificationService.onTicketStatusChanged` notifies the assigned technician.
3. **Outputs & DB Side Effects**:
   - `tickets.status` updated to `CANCELLED`.
   - `ticket_events` record inserted.
   - Assigned technician receives status change alert.
   - HTTP 200 returned.

### Journey 3: Invoice Payment Capture & Subscription Activation

1. **Triggers/Inputs**:
   - _Option A (Online PayPal)_: Client submits `{ paypalOrderId }` via `POST /api/v1/invoices/:id/capture-paypal` (or `/api/v1/billing/invoices/:id/capture-paypal`).
   - _Option B (Manual Wire Transfer Validation)_: Admin submits `POST /api/v1/invoices/:id/mark-paid` upon verifying client bank/wire transfer.
2. **Execution (Command vs Query)**:
   - _Query_: `invoiceManagementService.getInvoiceById` retrieves invoice and checks that `status !== 'PAID'`.
   - _External Command (Option A)_: `paypalService.captureOrder(paypalOrderId)` captures funds via PayPal REST API.
   - _Command (Mutation)_: `invoiceRepository.updateStatus(id, 'PAID')` updates invoice status in DB.
   - _Command (Mutation)_: `activateExpiredSubscriptionsForClient` queries `subscriptionRepository.findByClient` and calls `updateStatus(sub.id, 'ACTIVE')` for any `EXPIRED` subscriptions.
   - _Command (Mutation)_: `notificationService.createInAppNotification` generates payment notifications for client and all admin users.
3. **Outputs & DB Side Effects**:
   - `invoices.status` updated to `PAID`.
   - Linked `subscriptions.status` updated from `EXPIRED` to `ACTIVE`.
   - `notifications` records created for client and admins.
   - HTTP 200 returned with updated invoice object.

---

## 🛠️ Workspace Directory & Layer Boundaries

To maintain boundary enforcement and DIP, all future agent work must adhere to these folder responsibilities and import rules:

```
msp_client_portal/
├── packages/                       # Shared monorepo packages & MCP server
│   ├── errors/                     # Standardized Domain Error primitives & Express adapters (@shared/errors)
│   └── mcp-server/                 # Internal MSP Model Context Protocol server (Ticket, RMM, Security tools)
│
├── server/src/
│   ├── shared/                     # Cross-cutting infrastructure & utilities
│   │   ├── config/                 # Environment, database pool & runtime config
│   │   ├── db/                     # Entities: Drizzle connection pool, schemas & migrations
│   │   ├── dtos/                   # Data Transfer Objects & validation schemas
│   │   ├── middleware/             # Express middleware (auth, gateway, rate limiting)
│   │   ├── policies/               # Access control policy definitions (TicketAccessPolicy)
│   │   ├── repositories/           # Shared base repositories (BaseRepository.ts)
│   │   ├── types/                  # Entities: Pure interfaces & enums
│   │   └── utils/                  # Shared utility drivers (logger, emailService, pdfGenerator, cache)
│   │
│   └── modules/                    # Business Domain Bounded Contexts
│       ├── auth/                   # Authentication, user management, RBAC
│       ├── tickets/                # Creation, status, quota, assignment, escalation services
│       ├── billing/                # Invoices, expenses, PayPal payments, financial reporting
│       ├── subscriptions/          # Plans, client subscriptions, renewal scheduler
│       ├── rmm/                    # Alerts, agents, patch management, maintenance windows
│       ├── equipment/              # Device inventories, Nextcloud slots, OTP activation
│       ├── crm/                    # Deals, leads, pipeline stages, client sales
│       ├── notifications/          # In-app notifications & email preferences
│       └── system/                 # System diagnostics, health checks, Nextcloud provisioning
│
└── client/src/
    ├── components/ui/              # MANDATORY UI Primitives: Base shadcn/ui components
    ├── components/shared/          # Domain-agnostic macro patterns (Page, Breadcrumbs, StatsGrid)
    ├── components/layout/          # Layout shells (AppLayout, TopNav, AppSidebar)
    ├── components/[domain]/        # Feature Components: Must strictly use components from components/ui/
    ├── routes/                     # Layout Routes: File-based layout route hierarchy (_public/, _auth/, _app/)
    ├── pages/                      # Page Views: Top-level route page view implementations
    ├── services/                   # API Adapters: Axios HTTP services
    └── store/                      # Application State: Zustand stores
```

### 🧩 Feature Module Internal Anatomy & Public API Gateway

Each domain module inside `server/src/modules/<domain>/` operates as an autonomous **mini-application** (bounded context). It encapsulates its own HTTP routes, controller adapters, business service logic, data access repositories, models/schemas, and co-located unit tests.

To enforce loose coupling, Clean Architecture, and domain encapsulation, every module MUST maintain the following internal structure and expose its public surface area strictly via a module gateway (`index.ts`):

```text
server/src/modules/<feature>/
├── routes/                # [feature].routes.ts: HTTP route definitions & middleware mapping
├── controllers/           # [Feature]Controller.ts: Parses HTTP requests & calls the service layer
├── services/              # [Feature]Service.ts: Core business logic (validations, calculations, rules)
├── repositories/          # [Feature]Repository.ts: Database queries & ORM data persistence
├── models/                # [feature].model.ts / schema: Module-specific DTOs, schemas & types
└── index.ts               # The Public API / Gateway for this feature module
```

#### Module Gateway Rules (`index.ts`):
1. **Public API Contract**: `index.ts` acts as the single gateway for the module. Other modules (`billing`, `tickets`, `notifications`, `crm`) MUST ONLY consume services, types, or event hooks explicitly re-exported by `index.ts`.
2. **Forbidden Cross-Module Imports**: Importing internal repositories, controllers, or raw ORM schemas directly from another module (e.g., `import { TicketRepository } from '@modules/tickets/repositories/TicketRepository'`) is strictly **FORBIDDEN**. Inter-module interactions must go through the public service interface.
3. **Domain Encapsulation**: Data access details, query logic, and internal helpers remain private to the module, preserving clean boundaries and simplifying unit testing and future microservice extraction.

### Explicit Import Rules for Agents

1. **Entities Layer (`server/src/shared/types/`, `server/src/shared/db/schema/`)**:
   - **Allowed Imports**: None (pure TypeScript definitions).
   - **Forbidden Imports**: Services, controllers, repositories, ORM schema, Express.

2. **Use Case / Service Layer (`server/src/modules/<domain>/services/`)**:
   - **Allowed Imports**: Domain Errors (`@shared/errors`), Entities (`@shared/types`), Repositories (`@modules/<domain>/repositories`), DTOs (`@shared/dtos`), Utils (`@shared/utils`).
   - **Forbidden Imports**: Express objects (`Request`, `Response`), database pool or schema (`@shared/db`), controllers, routes.
   - **Error Handling Rule**: Throw typed domain error classes directly from `@shared/errors` (e.g. `throw new NotFoundError(...)`, `throw new ForbiddenError(...)`). Never use deprecated `AppError.factory()` or raw `throw new Error(...)`.
   - **Notification & Email Dispatch Integrity Rule**: Authentication, verification, and recovery flows (`AuthService.forgotPassword`, `AuthService.register`, `TicketCreationService`, `InvoicePaymentService`) **MUST NEVER stub out, leave as comments, or omit email/notification dispatches**. Any generated token, OTP, quotation, or invoice event must explicitly invoke the corresponding utility driver (e.g., `sendPasswordResetEmail`, `sendOTPEmail`, `sendInvoiceDueEmail` from `@shared/utils/emailService`).

3. **Repository Layer (`server/src/modules/<domain>/repositories/`, `server/src/shared/repositories/`)**:
   - **Allowed Imports**: `db` instance (`@shared/db`), Drizzle schemas, Entities (`@shared/types`), Domain Errors (`@shared/errors`).
   - **Forbidden Imports**: Controllers, Express, Services (prevent circular dependencies), business logic calculations.

4. **Controller Layer (`server/src/modules/<domain>/controllers/`)**:
   - **Allowed Imports**: Services (`@modules/<domain>/services`), Domain Errors (`@shared/errors`), DTOs (`@shared/dtos`), Entities (`@shared/types`), Express (`Request`, `Response`).
   - **Forbidden Imports**: Repositories, `db` instance (`@shared/db`).
   - **Async Error Handling Rule**: Rely on **Express 5 native async error propagation**. Do NOT wrap actions in `try/catch (err) { next(err); }` boilerplate. NEVER send inline error responses (e.g., `res.status(400).json(...)`) — throw typed domain errors and let the global error middleware handle formatting.

5. **Client UI Component Layer (`client/src/components/`, `client/src/pages/`)**:
   - **4-Level Architectural Layering**:
     $$\text{Level 1: Primitives (/components/ui)} \longleftarrow \text{Level 2: Shared Blocks (/components/shared)} \longleftarrow \text{Level 3: Feature Components (/components/[domain])} \longleftarrow \text{Level 4: Views/Pages (/pages, /routes)}$$
     - **Level 1: Primitives (`/components/ui/`)**: Pure presentation components (shadcn/ui primitives like `Button`, `Dialog`, `Input`, `Badge`). Zero awareness of database, API contracts, services, stores, feature components, or pages.
     - **Level 2: Shared Blocks (`/components/shared/`, `/components/layout/`)**: Reusable macro UI patterns that remain strictly domain-agnostic (e.g., `Page`, `MaxWidthWrapper`, `StatsGrid`, `Breadcrumbs`, `ThemeToggle`, `AppLayout`, `TopNav`, `AppSidebar`). Accepts generic props and slots instead of domain entities.
     - **Level 3: Feature Components (`/components/[domain]/`, `/features/[domain]/`)**: Domain-aware components tied to business rules, API models, and backend actions (e.g., `<NewTicketModal/>`, `<BillingSheet/>`, `<DeviceTable/>`, `<TicketTimeline/>`, `<CheckoutSheet/>`). Ingests domain data types and handles local domain interactions.
     - **Level 4: Views & Pages (`/pages/`, `/routes/`)**: Route-level orchestrators. They handle route parameters, URL query syncing (`useUrlState`), and compose Level 3 Feature components alongside Level 2 Page layouts.
   - **Strict One-Way Dependency Flow & Isolation**:
     - A lower level **can never import from a higher level**.
     - Feature modules **must never import directly from inside another feature module**; they interact exclusively through explicit shared services or public hooks.
     - Enforced automatically at the linter level via `no-restricted-imports` in [`client/eslint.config.js`](file:///c:/Users/support/Workspace/msp_client_portal/client/eslint.config.js).
   - **Mandatory UI Rule**: All UI elements (Buttons, Inputs, Selects, Dialogs, Cards, Tables, Badges, Tabs, Tooltips, Labels, Checkboxes) **MUST strictly use `shadcn/ui` components from `client/src/components/ui/`**.
   - **Mandatory Zod Form Validation Rule**: All client forms and modal submission dialogs (authentication, registration, password recovery, profile edits, ticket creation) **MUST strictly validate input using Zod schemas (`schema.safeParse(...)`)** mirroring backend DTO constraints (`@shared/dtos/auth.dto.ts`). Password fields must enforce complexity rules (min 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and identical password confirmation). Validation feedback must map directly to `t("namespace.key")` translation keys.
   - **Mandatory i18n Rule**: NO user-facing UI text, headers, subheaders, badges, tooltips, search placeholders, modal titles, or table headers may be hardcoded in raw English or Spanish strings. All user-facing strings **MUST use `useTranslation()` from `react-i18next`** (`t("namespace.key")`) and be defined in both `client/src/locales/en_US.json` and `client/src/locales/es_DO.json`.
     - **FORBIDDEN: Language-Detection Hacks**: Never write `t('someKey') === 'Spanish text' ? 'Spanish' : 'English'` or any variant that inspects the _output_ of a `t()` call to infer the active language. Instead, always add a dedicated translation key for each distinct string.
   - **Mandatory Deep Link & Resource State Rule**: All page sub-views (tabs: `?tab=...`), table filters (`?status=...`, `?search=...`), and modal dialog overlays (`?openModal=...`) **MUST sync with URL search parameters using `useUrlState`**.
   - **Mandatory Synchronized Control Height Standards**: All interactive controls (`Button`, `Input`, `SelectTrigger`, and action toolbars) adhere to a synchronized size system anchored on the compact `h-7` (28px) standard:
     - `xs`: `h-5` (20px) | `sm`: `h-6` (24px) | `default`: `h-7` (28px) | `lg`: `h-8` (32px).
     - **Zero Ad-Hoc Overrides**: Never apply hardcoded `h-8.5`, `h-9`, `h-10`, or custom padding on `Input` or `SelectTrigger`.
   - **Forbidden Imports**: Raw unstyled HTML primitives (`<button>`, `<input>`, `<select>`, `<dialog>`) when a `shadcn/ui` primitive is available.

---

## ⚡ Performance, Code Splitting & Dynamic Loading Architecture

To guarantee rapid initial page loads (< 1.5s FCP), minimal bundle sizes, and zero layout shifts (CLS), the frontend adheres to the following performance specifications:

### 1. Route-Level & Component-Level Code Splitting (`lazyWithRetry`)
- **Mandatory Dynamic Route Loading**: All top-level route pages in `client/src/routes/` and `client/src/protected-routes.tsx` **MUST be dynamically imported using `lazyWithRetry`** from `@/lib/lazyWithRetry`.
- **Heavy Feature Splitting**: Non-critical heavy components (chart visualization libraries, complex modals like `ScheduleMaintenanceModal`, `NextcloudInfoModal`, and heavy tab views like `RmmDashboard`) must be lazily loaded rather than statically bundled into parent views.
- **Exponential Backoff & Network Resilience**: Dynamic imports are wrapped in automatic retries (2 retries at 300ms, 900ms) with a session-guarded page reload fallback (`sessionStorage` timestamp check) to gracefully recover when new production deployments invalidate asset chunk hashes.

### 2. Domain-Specific Skeletons & Localized Suspense Boundaries
- **Zero Fullscreen Generic Spinners**: Top-level routes must never block on a generic fullscreen loading spinner.
- **Localized Skeletons (`components/skeletons/`)**: Every lazy route must be wrapped with `<RouteSuspenseWrapper fallback={<MatchingSkeleton />}>` using its domain-specific skeleton:
  - `DashboardSkeleton`: KPI summary grid + quota card + chart placeholders (for `/dashboard`, `/tech/dashboard`, `/financial`, `/admin/api-status`).
  - `TablePageSkeleton`: Search/filter bar + table row skeletons (for `/tickets`, `/devices`, `/billing`, `/admin/users`, `/maintenance`, `/crm`).
  - `DetailSkeleton`: Breadcrumbs + 2-column description and activity sidebar (for `/tickets/:id`).
  - `ContentPageSkeleton`: Clean card blocks (for `/profile`, `/notifications/preferences`, `/help`, `/plans`, `/terms`, `/privacy`, `/resources`).
- **Granular Error Isolation (`ChunkErrorBoundary`)**: Every async chunk is shielded by an isolated `ChunkErrorBoundary` that displays an inline retry action without crashing the surrounding `AppLayout` shell.

### 3. Intent-Based & Idle Preloading Strategy
- **Hover & Focus Intent Preloading**: Interactive navigation elements (`AppSidebar`, `TopNav`) **MUST trigger `preloadRoute(to)` on `onMouseEnter` and `onFocus`** to download destination chunks prior to click navigation.
- **Background Idle Preloading (`preloadOnIdle`)**: High-probability secondary route chunks (`/tickets`, `/devices`, `/plans`, `/billing`, `/crm`) are quietly preloaded during browser idle time using `requestIdleCallback` upon layout initialization.

### 4. Zero-Flicker Skeleton Deferral (`SKELETON_DISPLAY_DELAY_MS`)
- **Preventing Skeleton Flash**: For fast API responses or cached loads (< `SKELETON_DISPLAY_DELAY_MS` defined in `@/constants/ui`), skeletons must not flash briefly.
- **Enforcement**: All asynchronous loading gates in page views and `RouteSuspenseWrapper` **MUST use `useDeferredLoading(loading, SKELETON_DISPLAY_DELAY_MS)`** from `@/hooks/useDeferredLoading` before rendering skeleton placeholders.

### 5. Vite Vendor Chunk Optimization
- `vite.config.ts` enforces Rollup `manualChunks` splitting into isolated vendor bundles:
  - `vendor-react`: `react`, `react-dom`, `react-router-dom`
  - `vendor-ui`: `@radix-ui/*`, `lucide-react`, `sonner`, `clsx`, `tailwind-merge`
  - `vendor-table`: `@tanstack/react-table`
  - `vendor-form`: `react-hook-form`, `@hookform/resolvers`, `zod`
  - `vendor-i18n`: `i18next`, `react-i18next`
  - `vendor-state`: `zustand`, `axios`

---

## 🚨 Standardized Domain Error Hierarchy & Express 5 Async Error Handling

All backend modules, services, policies, middleware, and controllers must adhere to the unified domain error system in `@shared/errors` (`packages/errors/`).

### Domain Error Primitives Matrix

| Error Class | Status Code | Error Code (`code`) | Inheritance / Base | Typical Use Case |
| :--- | :---: | :--- | :--- | :--- |
| **`ValidationError`** | 400 | `VALIDATION_ERROR` | `AppError` | Payload / schema / input validation failures |
| **`NotFoundError`** | 404 | `NOT_FOUND_ERROR` | `AppError` | Missing entities (tickets, users, invoices, slots, leads) |
| **`UnauthorizedError`** | 401 | `UNAUTHORIZED_ERROR` | `AppError` | Missing/invalid authentication token or session |
| **`ForbiddenError`** | 403 | `FORBIDDEN_ERROR` | `AppError` | RBAC violations, unauthorized tenant access |
| **`ConflictError`** | 409 | `CONFLICT_ERROR` | `AppError` | Unique constraints, duplicate records |
| **`InternalServerError`**| 500 | `INTERNAL_SERVER_ERROR`| `AppError` | Unhandled non-operational system failures |
| **`RateLimitError`** | 429 | `RATE_LIMIT_EXCEEDED` | `AppError` | Tenant / IP rate limiting exceeded |
| **`ExternalServiceError`**| 502| `EXTERNAL_SERVICE_ERROR`| `AppError` | External third-party failure (Nextcloud, PayPal, etc.) |
| **`SlaViolationError`** | 403 | `SLA_VIOLATION` | `ForbiddenError` | Ticket cancellation attempted outside 60-min SLA |
| **`TicketLimitExceededError`**| 403 | `TICKET_LIMIT_EXCEEDED` | `ForbiddenError` | Client / device quota exceeded |
| **`InvalidTransitionError`**| 400 | `INVALID_STATUS_TRANSITION`| `ValidationError`| Disallowed state machine transition |
| **`InvalidFileTypeError`**| 400 | `INVALID_FILE_TYPE` | `ValidationError` | Disallowed file MIME type or extension |

### Mandatory Error Handling Rules for Agents

1. **Direct Class Instantiation**:
   - Always instantiate and throw the specific typed domain error class directly:
     ```ts
     throw new NotFoundError('Equipment slot not found', { slotIndex });
     ```
   - The legacy `AppError.badRequest()`, `AppError.forbidden()`, etc. factory methods are **deprecated** and must not be used in new code.
2. **No Untyped `throw new Error()`**:
   - Services, middleware, and adapters must never throw raw untyped `new Error('...')` or string literals. Always throw the corresponding typed domain error.
3. **No Inline HTTP Error Responses in Controllers**:
   - Controllers must NEVER return inline error responses such as `res.status(400).json({ error: '...' })`. Always throw the appropriate domain error (e.g. `throw new ValidationError('...')`) to allow the global Express error adapter to serialize the response consistently.
4. **Express 5 Native Async Rejection Pattern**:
   - Controllers and route handlers run on **Express 5**, which natively catches unhandled promise rejections in `async` handlers and routes them to the global error middleware.
   - Do NOT write boilerplate `try { ... } catch (err) { next(err); }` in controllers. Write clean, direct async actions:
     ```ts
     async getSlots(req: Request, res: Response): Promise<void> {
       const subId = req.params.subId as string;
       const slots = await this.equipmentSvc.getEquipmentSlots(subId, req.user!.tenantId, req.user!.role === 'ADMIN');
       res.json({ success: true, data: slots });
     }
     ```

---

## 🔌 Configured Model Context Protocol (MCP) Integration Infrastructure

The project development environment and runtime orchestration integrate directly with Model Context Protocol (MCP) servers:

### 1. Internal Workspace MCP Server (`packages/mcp-server`)
The repository includes an internal TypeScript MCP server (`packages/mcp-server/src/index.ts`) providing direct programmatic tooling for MSP automation:
- **`ticketTools`**: Ticket inspection, state machine mutations, technician assignment.
- **`equipmentTools`**: Device slot verification, OTP management, Nextcloud user activation.
- **`rmmTools`**: Agent health status, patch verification, maintenance task triggering.
- **`securityTools`**: Audit log extraction, credential rotation, tenant isolation verification.
- **`remediationTools`**: Automated self-healing scripts and alert resolution.
- **`localHostTools`**: Local development service diagnostics and health monitoring.

### 2. External & Developer MCP Tooling
Configured in developer runtime for component discovery, documentation lookup, sandbox payment processing, and testing:

| MCP Server | Protocol / Mode | Core Purpose & Domain Alignment |
| :--- | :--- | :--- |
| **`context7`** | Remote HTTP | Live documentation lookup for third-party libraries, APIs, SDKs, and version upgrades. |
| **`shadcn`** | MCP Tooling | UI component registry search, item preview, and installation for `client/src/components/ui/` primitives. |
| **`stitch`** | Remote HTTP | Google Stitch UI design system generation, screen layout creation, and visual theme configuration. |
| **`paypal`** | Sandbox CLI | PayPal sandbox invoicing, order creation, payment capture, and recurring billing testing (`modules/billing`). |
| **`postgres`** | DB Adapter | Direct PostgreSQL query execution, schema inspection, and verification across multi-tenant tables. |
| **`gmail`** | Remote HTTP OAuth | In-app billing/notification email dispatch, draft generation, and email thread tracking. |
| **`chrome-devtools`** | Headless Chrome | Automated browser testing, DOM verification, performance tracing, network request monitoring, and visual snapshots. |
| **`sequential-thinking`**| Cognitive Tool | Dynamic multi-step reasoning, architectural analysis, and complex refactoring plans. |
| **`memory`** | Graph DB | Persistent project observations, relations, and entity graph tracking. |

---

## 🧹 Uncle Bob's Rules (Robert C. Martin)

The following rules from _Clean Code_, _Clean Architecture_, and _The Clean Coder_ are mandatory for all human developers and AI agents operating on this codebase.

### 1. The Boy Scout Rule

> _"Always leave the code cleaner than you found it."_

When opening a file to fix a bug or add a feature, if you spot a poorly named variable or an overly long function, refactor it on the spot. This prevents technical debt from accumulating over time.

### 2. The Three Rules of TDD (Test-Driven Development)

Strict cycle — no exceptions:

1. **No production code** will be written unless it is to make a failing unit test pass.
2. **No more than one unit test** will be written beyond what is sufficient to fail (compilation errors count as failure).
3. **No more production code** will be written than strictly necessary to make the failing test pass.

### 3. The S.O.L.I.D. Principles

- **S (Single Responsibility)**: A class or module must have one, and only one, reason to change.
- **O (Open/Closed)**: Software must be open to extension, but closed to modification.
- **L (Liskov Substitution)**: Derived types must be substitutable for their base types without breaking the application.
- **I (Interface Segregation)**: Prefer many small, specific interfaces over one large, multi-purpose interface.
- **D (Dependency Inversion)**: Depend on abstractions, not on concrete implementations.

### 4. Clean Code Rules

**🧼 Functions**

- **Small**: An ideal function should be between 4 and 20 lines.
- **Do one thing**: If a function validates input, transforms data, and saves to the database, it is doing too much.
- **Few arguments**: Zero is ideal (niladic). One or two is acceptable. Three requires justification; more than three must be avoided (pass them as an object).
- **Command-Query Separation (CQS)**: A function must either do something (command) or answer something (query), never both.

**🏷️ Naming**

- Use intention-revealing names (avoid `x`, `temp`, `data`).
- Variables/classes are nouns; functions are verbs.
- Prefer names that are easy to pronounce and easy to search for in the editor.

**💬 Comments**

> _"Don't comment bad code — rewrite it."_

Code must explain itself. Comments are only allowed when strictly necessary to explain the _why_ of a decision, never the _what_ or the _how_.

### 5. The Dependency Rule (Clean Architecture)

- Source code dependencies may only point **inward** toward high-level business rules.
- Inner layers (entities, use cases) must know nothing about outer layers (database, web framework, UI).

### 6. Clean Error Handling

- **Prefer Exceptions to Return Codes / Manual Status Formatting**: Use typed domain exceptions instead of returning error codes or manual error response JSON objects in controllers.
- **Define Exception Classes in Terms of Caller's Needs**: Utilize domain error classes from `@shared/errors` (`ValidationError`, `NotFoundError`, `ForbiddenError`, `SlaViolationError`, etc.) to convey semantic meaning, proper HTTP status codes, and machine-readable error codes.
- **Don't Return Null or Raw String Errors**: Throw typed domain exceptions with contextual metadata (`details`) rather than passing raw strings or returning null for error states.

---

## ❓ Agent Operational Protocol: Upfront Clarification & Interactive Decision Making

To ensure zero miscommunication, minimize rework, and respect user design intent, all AI agents operating on this codebase must adhere to the **Upfront Clarification Protocol**:

### 1. Interactive Questions Before Planning / Applying Changes
- Whenever a task involves **UI/UX choices, feature scope tradeoffs, component adaptations (e.g., converting demo templates into production components), or ambiguous requirements**, agents **MUST NOT make silent assumptions**.
- Agents **MUST proactively present structured multiple-choice questions** using the interactive `ask_question` tool before finalizing or executing an implementation plan.

### 2. Standard Question Formatting Rules
- **User-Centric Phrasing**: Format options as the user's direct response/action.
- **Recommended Defaults**: Always prefix the recommended / best-practice option with `(Recommended)` as the first choice.
- **Clear Scope Separation**: Split distinct decisions into separate questions (e.g., data source binding, navigation section headers, search depth / keyboard shortcuts, responsive behavior).
- **Wait for Input**: Block execution until the user selects their preferred choices or provides custom input.

---

## 🔀 Git Workflow & Commit Discipline (Enforced via Husky & Commitlint)

All commits in this monorepo must strictly adhere to the **Conventional Commits** specification. Pre-commit/commit-msg validation is enforced locally via `.husky/commit-msg` invoking `@commitlint/cli`.

### 1. Commit Structure
```text
<type>(<scope>): <imperative summary>

[optional bulleted description of what & why]

[optional issue reference: Resolves #123]
```

### 2. Scope & Type Guidelines
- **Allowed Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **Mandatory Scopes**: Use the domain module name or architectural boundary:
  - Modules: `auth`, `tickets`, `billing`, `subscriptions`, `rmm`, `equipment`, `crm`, `notifications`, `system`
  - Cross-cutting: `client`, `server`, `ui`, `i18n`, `infra`, `shared`, `deps`
- **Imperative Mood**: Use "add", "fix", "update", "remove", "refactor" (never "added", "fixing", "updates").
- **Atomic Commits**: Keep commits isolated to a single logical change. Do not bundle refactors with new features or security middlewares.

