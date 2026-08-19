# System Rules, Clean Architecture & Code Quality Guidelines

## 📌 Executive Summary

The **MSP Client Portal** (`msp_client_portal`) is a multi-tenant Managed Service Provider software platform designed to manage helpdesk support tickets, technician dispatch, device/equipment inventories, client subscription plans, recurring invoicing, cloud backups, and scheduled maintenance operations.

Architecturally, the application is structured as a **Layered Monolith** (PERN Stack: PostgreSQL, Express, React, Node.js with Drizzle ORM and Vite/Tailwind v4). The folder layout segregates routes, controllers, services, and repositories, and the codebase adheres to **Uncle Bob’s Clean Architecture & Clean Code principles**: the Dependency Rule is enforced, services rely on constructor-injected dependencies, and all data access flows through the repository layer.

This document serves as the master specification, architectural health report, and boundary enforcement guide for all human developers and AI agents operating on this codebase.

---

## 🏗️ Architecture & Dependency Rule Compliance

Clean Architecture mandates that source code dependencies must strictly point **INWARD** toward high-level policy and domain entities:

```
[ Frameworks & Drivers (DB, Express, UI) ]
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

### Layer Mapping & Status

1. **Entities Layer (`server/src/types/`, `server/src/db/schema/`)**:
   - Contains domain interfaces (`Ticket`, `User`, `Subscription`, `Invoice`, `Equipment`), status enums (`TicketStatus`, `UserRole`, `SubscriptionStatus`), and Drizzle schema table definitions.
   - *Compliance*: Pure domain types have no outward dependencies.

2. **Use Cases / Service Layer (`server/src/services/`)**:
   - Houses application business logic: ticket quota validation, 1-hour SLA cancellation enforcement, technician round-robin allocation, subscription renewal calculations, and payment handling.
   - *Compliance*: Every service exposes constructor injection with default singleton dependencies (e.g., `constructor(private userRepo: UserRepository = userRepository)`), so high-level use cases do not hard-couple to low-level concrete singletons. `AssignmentService` and its strategies access the database exclusively through `RoundRobinRepository`, `TicketRepository`, and `UserRepository` — no service imports `../db` directly.

3. **Interface Adapters (`server/src/controllers/`, `server/src/repositories/`, `client/src/services/`)**:
   - Controllers translate HTTP requests/responses into service inputs/outputs. Repositories translate Drizzle ORM queries into typed domain objects.
   - *Compliance*: No controller imports a repository or the `db` pool directly; all data access flows through the service layer.

4. **Frameworks & Drivers (`server/src/routes/`, `server/src/db/`, `client/src/components/`)**:
   - Contains Express routes, database connection pool (`db.ts`), email/WhatsApp utility drivers, and React UI components.
   - *Compliance*: Framework-specific code (Drizzle ORM access, static bank account data) is confined to `server/src/db/`, repositories, and `client/src/constants/` — it does not leak into domain services or UI feature components.

5. **The API Gateway Layer (`server/src/middleware/gateway*.ts`)**:
   - Sits in front of downstream route clusters to handle global ingress logic uniformly:
     - **Authentication Header Injection**: Decodes incoming JWT / session tokens at the entry point and injects standardized `X-User-Id` and `X-Tenant-Id` headers into downstream request context.
     - **Multi-Tenant Rate Limiting**: Protects downstream services from noisy neighbors by enforcing per-tenant (`X-Tenant-Id`) sliding window request limits (100 req/15 min) and returning HTTP 429 (`TOO_MANY_REQUESTS`).
     - **Cluster Path Routing**: Directs public path clusters (`/api/v1/billing/*`, `/api/v1/workspaces/*`, `/api/v1/tickets/*`, `/api/v1/auth/*`) to internal handlers while maintaining header propagation.

---

## 🛠️ Master Business Logic Specification (v2.0)

```
                       ┌──────────────────────────────┐
                       │  MSP Core Logic Architecture │
                       └──────────────┬───────────────┘
                                      │
  ┌───────────────┬───────────────┼───────────────┬───────────────┐
  ▼               ▼               ▼               ▼               ▼
1. Support &    2. Subscriptions 3. Access Control 4. Billing      5. Account Health
   Escalation      & Licensing      & State Machine  Automation       & QBR Logic
```

### Module 1: Support, Routing & Escalation Engine

* **BL-101: 1-Hour SLA Cancellation Rule** (`TicketService.enforceSLARule`)
  * **Condition**: Tickets in `WARRANTY` or `SERVICE_OUTAGE` categories can only be cancelled within 60 minutes ($\text{SLA\_WINDOW\_MS} = 3,600,000$) of creation.
  * **Enforcement**: Late cancellation attempts throw `AppError.slaViolation`.
* **BL-102: Round-Robin Dispatch with Specialty Fallback** (`AssignmentService.getNextTechnician`)
  * **Condition**: Distributes tickets equitably per category.
  * **Fallback Chain**: Active Specialists $\rightarrow$ General Active Technician Pool.
* **BL-103: Alert Noise Reduction & Auto-Remediation** (`AlertService.processRMMAlert`)
  * **Condition**: RMM alerts occurring within a 15-minute window for the same asset are deduplicated into a single parent ticket.
  * **Self-Healing**: Automated scripts that resolve issues within $300\text{ seconds}$ auto-close the ticket as `RESOLVED_AUTOMATED` without dispatcher intervention.
  * **Flapping Override** (Rule 1.1): Alerts that trigger $\ge 3$ times for the same `(alertType, assetId)` within a rolling 24-hour window bypass auto-close, open a `PREVENTATIVE_MAINTENANCE` ticket tagged `[FLAPPING_ALERT]`, and route directly to Tier 2.
* **BL-104: Time-Based Tier Escalation** (`TicketService.enforceEscalation`, `processPendingEscalations`)
  * **Condition** (Rule 1.2): An OPEN, unworked ticket (unassigned or without responses) escalates to a Tier 2 specialist once its priority threshold is exceeded: CRITICAL = 10m, HIGH = 20m, MEDIUM = 45m, LOW = 120m.
  * **Routing** (Rule 1.3): `CapacityWeightedAssignmentStrategy` routes to the technician minimizing weighted open load ($\text{P1}=4.0$, $\text{P2}=2.0$, $\text{P3}=1.0$, $\text{P4}=0.5$), falling back to the general active pool when all specialists exceed a 15.0 capacity threshold.
* **KPIs (Rule 1.4)**:
  * $NRR = \frac{TotalAlerts - HumanTouchTickets}{TotalAlerts}$ (Noise Reduction Ratio).
  * $SHE = \frac{AutoClosed}{AutoClosed + FlappingOverrides}$ (Self-Healing Efficiency).
  * $FCR_A = \frac{AutomatedResolved}{TotalTicketsIngested}$ (Automated First Contact Resolution).

### Module 2: Subscriptions, Licensing & True-Ups

* **BL-201: Plan Feature Quota Rule** (`TicketService.enforceTicketLimit`)
  * **Condition**: Validates client subscription feature caps (`HELPDESK_SUPPORT`).
  * **Enforcement**: Blocks ticket creation with `AppError.forbidden` (`TICKET_LIMIT_EXCEEDED`) once thresholds (e.g., 5 tickets/device/month or 10 tickets/account/month) are reached.
* **BL-202: Automated License True-Up & Scaling** (`SubscriptionService.reconcileSeats`)
  * **Condition**: Nightly job reconciles cloud user seats (e.g., M365/Azure AD) and active RMM agents against active client contracts.
  * **Action**: Automatically updates billable quantity ($Q_{\text{billed}}$) for the next billing run if active count exceeds contracted baseline ($Q_{\text{contracted}}$).
* **BL-203: Out-of-Scope Project Guardrails** (`TicketService.enforceScope`)
  * **Condition**: Requests outside the active contract scope (e.g., new site setups, hardware moves) require client authorization and shift to `PENDING_ESTIMATE` before work begins.

### Module 3: Access Control & State Machine

* **BL-301: Strict Ticket State Machine & Access Isolation** (`TicketService.updateTicketStatus`, `TicketService.getTickets`)
  * **Validation**: All status changes must pass the defined `STATUS_TRANSITIONS` matrix.
  * **RBAC Scoping Rules**:
    * **Clients**: Strict multi-tenant isolation by `tenant_id`. Status transitions restricted to `CANCELLED`.
    * **Technicians**: View/modify permissions restricted to explicitly assigned tickets.
    * **Admins**: Global access across all tenants, tickets, and configurations.

### Module 4: Billing Automation & Invoicing Lifecycle

* **BL-401: Automatic Subscription Reactivation** (`InvoiceService.capturePaypalOrder`, `InvoiceService.markAsPaid`)
  * **Trigger**: Successful PayPal order capture or manual invoice flag set to `PAID`.
  * **Action**: Instantly updates all `EXPIRED` client subscriptions to `ACTIVE` and broadcasts in-app notifications to both the client and all administrators.
* **BL-402: Recurring Renewal Scheduler** (`SubscriptionScheduler.processSubscriptions`)
  * **Execution**: Background process running on set cron schedule.
  * **Workflow**: Scans active subscriptions $\rightarrow$ checks expiry dates $\rightarrow$ calculates hardware multipliers ($M_{\text{equip}}$) $\rightarrow$ creates recurring PostgreSQL invoices $\rightarrow$ dispatches billing emails.
* **BL-403: Manual Wire Transfer & Offline Payment Validation** (`InvoiceService.markAsPaid`)
  * **Trigger / Authorization**: Admin user (`UserRole.ADMIN`) validates manual wire transfer or bank transfer payment.
  * **Action**: Updates invoice status to `PAID` without PayPal API dependency, reactivates linked `EXPIRED` client subscriptions to `ACTIVE`, and dispatches in-app notifications to both the client and all administrators.

### Module 5: Account Health & QBR Logic

* **BL-501: Composite Client Health Scoring** (`ClientHealthService.calculateScore`)
  * **Formula**:
    $$H = 0.40 \times S_{\text{ticket}} + 0.30 \times S_{\text{hardware}} + 0.30 \times S_{\text{security}}$$
  * **Action**: Accounts scoring below $70\%$ trigger an automated task for the vCIO to schedule a Quarterly Business Review (QBR) and review contract margins.

---

## 🔄 Core Data Journeys & State Changes (Command-Query Separation)

### Journey 1: Ticket Creation & Round-Robin Auto-Assignment
1. **Triggers/Inputs**: Client submits `CreateTicketInput` payload (`title`, `description`, `category`, `priority`, optional `equipmentId`) via `POST /api/tickets` with JWT credentials.
2. **Execution (Command vs Query)**:
   - *Query / Validation*: `TicketService.enforceTicketLimit` checks active client subscriptions (`subscriptionRepository.findByClient`) and queries monthly ticket count (`ticketRepository.countClientTicketsInCurrentMonth` or `countEquipmentTicketsInCurrentMonth`).
   - *Command (Mutation)*: `ticketRepository.create` inserts a new ticket record into PostgreSQL with `OPEN` status.
   - *Command (Mutation)*: `ticketEventRepository.create` records a creation audit event (`OPEN`, changed_by: `clientId`).
   - *Command (Mutation)*: `assignmentService.getNextTechnician(category)` calculates next technician and updates `round_robin_state` table.
   - *Command (Mutation)*: `ticketRepository.assignTechnician` updates `assigned_tech_id` on the ticket record.
   - *Side Effect (Query + Notification)*: `userRepository.findById` queries client user; `notificationService.onTicketCreated` sends email and in-app notifications.
3. **Outputs & DB Side Effects**:
   - `tickets` table: Record inserted with `OPEN` status and assigned technician ID.
   - `ticket_events` table: Creation event logged.
   - `round_robin_state` table: `last_assigned_tech_id` updated for category.
   - HTTP 201 response returned with created ticket payload.

### Journey 2: Ticket Cancellation & 1-Hour SLA Validation
1. **Triggers/Inputs**: Client sends `UpdateTicketStatusInput` payload `{ status: "CANCELLED", notes: "Resolved self" }` via `PATCH /api/tickets/:id/status`.
2. **Execution (Command vs Query)**:
   - *Query*: `ticketRepository.findById(ticketId)` fetches current ticket record.
   - *Validation*: Verifies tenant matching (`ticket.tenant_id === tenantId`) and client ownership (`ticket.client_id === userId`).
   - *Validation*: Verifies transition matrix (`STATUS_TRANSITIONS[ticket.status]`).
   - *Query / SLA Validation*: If category is `WARRANTY` or `SERVICE_OUTAGE`, `enforceSLARule` compares `Date.now() - ticket.created_at` against `SLA_WINDOW_MS` (1 hour). Throws `AppError.slaViolation` if elapsed time > 60 minutes.
   - *Command (Mutation)*: `ticketRepository.updateStatus(ticketId, 'CANCELLED')`.
   - *Command (Mutation)*: `ticketEventRepository.create` logs transition event.
   - *Side Effect*: `notificationService.onTicketStatusChanged` notifies the assigned technician.
3. **Outputs & DB Side Effects**:
   - `tickets.status` updated to `CANCELLED`.
   - `ticket_events` record inserted.
   - Assigned technician receives status change alert.
   - HTTP 200 returned.

### Journey 3: Invoice Payment Capture & Subscription Activation
1. **Triggers/Inputs**:
   - *Option A (Online PayPal)*: Client submits `{ paypalOrderId }` via `POST /api/invoices/:id/capture-paypal`.
   - *Option B (Manual Wire Transfer Validation)*: Admin submits `POST /api/invoices/:id/mark-paid` upon verifying client bank/wire transfer.
2. **Execution (Command vs Query)**:
   - *Query*: `InvoiceService.getInvoiceById` retrieves invoice and checks that `status !== 'PAID'`.
   - *External Command (Option A)*: `paypalService.captureOrder(paypalOrderId)` captures funds via PayPal REST API.
   - *Command (Mutation)*: `invoiceRepository.updateStatus(id, 'PAID')` updates invoice status in DB.
   - *Command (Mutation)*: `activateExpiredSubscriptionsForClient` queries `subscriptionRepository.findByClient` and calls `updateStatus(sub.id, 'ACTIVE')` for any `EXPIRED` subscriptions.
   - *Command (Mutation)*: `notificationService.createInAppNotification` generates payment notifications for client and all admin users.
3. **Outputs & DB Side Effects**:
   - `invoices.status` updated to `PAID`.
   - Linked `subscriptions.status` updated from `EXPIRED` to `ACTIVE`.
   - `notifications` records created for client and admins.
   - HTTP 200 returned with updated invoice object.

---

## 🛠️ Workspace Directory & Layer Boundaries

To maintain boundary enforcement and DIP, all future agent work must adhere to these folder responsibilities and import rules:

```
server/src/
├── types/          # Entities: Pure interfaces & enums (NO dependencies)
├── db/schema/      # Entities: Drizzle table schemas (NO logic)
├── repositories/   # Interface Adapters: Drizzle ORM data access (NO business logic, NO req/res)
├── services/       # Use Cases: Business logic & validations (NO Express req/res, NO raw DB imports)
├── controllers/    # Interface Adapters: HTTP req/res parsing (NO business logic, NO direct repo imports)
├── routes/         # Frameworks: Express route declarations (NO logic)
└── middleware/     # Frameworks: Express middleware (auth, RBAC, upload, validation)

client/src/
├── components/ui/  # MANDATORY UI Primitives: Base shadcn/ui components
├── components/     # Feature Components: MUST strictly use components from components/ui/
├── routes/         # Layout Routes: File-based layout route hierarchy (_public/, _auth/, _app/)
├── pages/          # Page Views: Top-level route page view implementations
├── services/       # API Adapters: Axios HTTP services
└── store/          # Application State: Zustand stores
```

### Explicit Import Rules for Agents

1. **Entities Layer (`server/src/types/`)**:
   - **Allowed Imports**: None (pure TypeScript definitions).
   - **Forbidden Imports**: Services, controllers, repositories, ORM schema, Express.

2. **Use Case / Service Layer (`server/src/services/`)**:
   - **Allowed Imports**: Entities (`types/`), Repositories (`repositories/`), DTOs (`dtos/`), Utils (`utils/`).
   - **Forbidden Imports**: Express objects (`Request`, `Response`), database pool or schema (`../db`), controllers, routes.

3. **Repository Layer (`server/src/repositories/`)**:
   - **Allowed Imports**: `db` instance (`../db`), Drizzle schemas, Entities (`types/`).
   - **Forbidden Imports**: Controllers, Express, Services (prevent circular dependencies), business logic calculations.

4. **Controller Layer (`server/src/controllers/`)**:
   - **Allowed Imports**: Services (`services/`), DTOs (`dtos/`), Entities (`types/`), Express (`Request`, `Response`).
   - **Forbidden Imports**: Repositories (`repositories/`), `db` instance (`../db`).

5. **Client UI Component Layer (`client/src/components/`)**:
   - **Mandatory UI Rule**: All UI elements (Buttons, Inputs, Selects, Dialogs, Cards, Tables, Badges, Tabs, Tooltips, Labels, Checkboxes) **MUST strictly use `shadcn/ui` components from `client/src/components/ui/`**.
   - **Mandatory i18n Rule**: NO user-facing UI text, headers, subheaders, badges, tooltips, search placeholders, modal titles, or table headers may be hardcoded in raw English or Spanish strings. All user-facing strings **MUST use `useTranslation()` from `react-i18next`** (`t("namespace.key")`) and be defined in both `client/src/locales/en_US.json` and `client/src/locales/es_DO.json`.
   - **Mandatory Deep Link & Resource State Rule**: All page sub-views (tabs: `?tab=...`), table filters (`?status=...`, `?search=...`), and modal dialog overlays (`?openModal=...`) **MUST sync with URL search parameters using `useUrlState`**. Shareable links must automatically restore modal and tab state on direct load or refresh without unmounting layout frames (`AppLayout`).
   - **Forbidden Imports**: Raw unstyled HTML primitives (`<button>`, `<input>`, `<select>`, `<dialog>`) when a `shadcn/ui` primitive is available.

---


## 🧹 Uncle Bob's Rules (Robert C. Martin)

The following rules from *Clean Code*, *Clean Architecture*, and *The Clean Coder* are mandatory for all human developers and AI agents operating on this codebase.

### 1. The Boy Scout Rule
> *"Always leave the code cleaner than you found it."*

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
> *"Don't comment bad code — rewrite it."*

Code must explain itself. Comments are only allowed when strictly necessary to explain the *why* of a decision, never the *what* or the *how*.

### 5. The Dependency Rule (Clean Architecture)
- Source code dependencies may only point **inward** toward high-level business rules.
- Inner layers (entities, use cases) must know nothing about outer layers (database, web framework, UI).
