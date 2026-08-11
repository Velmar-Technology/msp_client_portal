# System Rules, Clean Architecture & Code Quality Guidelines

## 📌 Executive Summary

The **MSP Client Portal** (`msp_client_portal`) is a multi-tenant Managed Service Provider software platform designed to manage helpdesk support tickets, technician dispatch, device/equipment inventories, client subscription plans, recurring invoicing, cloud backups, and scheduled maintenance operations.

Architecturally, the application is structured as a **Layered Monolith** (PERN Stack: PostgreSQL, Express, React, Node.js with Drizzle ORM and Vite/Tailwind v4). While the folder layout visually segregates routes, controllers, services, and repositories, an audit based on **Uncle Bob’s Clean Architecture & Clean Code principles** reveals architectural boundary leaks, violation of the Dependency Rule, parameter bloat, god-class services, and direct coupling to framework components.

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
   - *Compliance*: **VIOLATED**. High-level services directly instantiate low-level concrete singletons, and `AssignmentService` imports framework DB drivers directly.

3. **Interface Adapters (`server/src/controllers/`, `server/src/repositories/`, `client/src/services/`)**:
   - Controllers translate HTTP requests/responses into service inputs/outputs. Repositories translate Drizzle ORM queries into typed domain objects.
   - *Compliance*: **VIOLATED**. Controllers bypass services to call repositories directly (`NotificationController`, `SubscriptionController`).

4. **Frameworks & Drivers (`server/src/routes/`, `server/src/db/`, `client/src/components/`)**:
   - Contains Express routes, database connection pool (`db.ts`), email/WhatsApp utility drivers, and React UI components.
   - *Compliance*: **VIOLATED**. Framework details (Drizzle ORM, static bank dataset) leak into domain services and UI components.

### Architectural Boundary Leaks Identified

* **Service-to-DB Boundary Leak**: `server/src/services/AssignmentService.ts` directly imports `db` and `roundRobinState` from `../db` and executes raw Drizzle ORM queries (`db.select()`, `db.insert()`), bypassing the Repository layer entirely and violating the Dependency Rule.
* **Controller-to-Repository Leak**: `server/src/controllers/NotificationController.ts` imports `notificationRepository` directly to perform data fetching and state mutations (`findByUser`, `markAsRead`, `deleteAllForUser`), skipping the Service layer. Similarly, `server/src/controllers/SubscriptionController.ts` imports `userRepository` directly.
* **Direct Concrete Service Coupling (DIP Violation)**: `InvoiceService.ts`, `TicketService.ts`, and `SubscriptionService.ts` depend directly on concrete singleton instances (`paypalService`, `notificationService`, `ticketRepository`) instead of injected abstractions or interfaces.
* **UI Infrastructure Leak**: `client/src/components/checkout-sheet.tsx` defines static Dominican bank account details (`BANK_ACCOUNTS`) and manual line-item tax calculations inline within UI layout logic.

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
* **BL-104: Time-Based Tier Escalation** (`TicketService.enforceEscalation`)
  * **Condition**: If a Tier 1 ticket remains unassigned or unworked past $T_{\text{threshold}} = 45\text{ mins}$, it escalates automatically to Tier 2 and flags the primary dispatcher.

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

## 🧩 SOLID & Clean Code Audit (Status: RESOLVED ✅)

### Single Responsibility Principle (SRP)
* **`server/src/services/InvoiceService.ts` [RESOLVED]**: Extracted `InvoicePdfService` for PDF generation wrapping and `InvoiceNotificationService` for invoice due emails, anti-spam window checks, payment confirmation, and cancellation notifications.
* **`server/src/services/SubscriptionService.ts` [RESOLVED]**: Extracted `SubscriptionQuotationService` for quote handling and email dispatches.
* **`server/src/services/TicketService.ts` [RESOLVED]**: Extracted `TicketQuotaService` for subscription monthly ticket limit validations.
* **`client/src/components/checkout-sheet.tsx` [RESOLVED]**: Extracted Dominican bank account dataset (`bankAccounts.tsx`), `OrderSummary.tsx`, and `PaymentFields.tsx` subcomponents, consolidating props into structured interfaces.

### Open/Closed & Liskov Substitution Principles (OCP / LSP)
* **Role-Based Conditional Branching [RESOLVED]**: Introduced `TicketAccessPolicy` and `InvoiceAccessPolicy` (`server/src/policies/`) to encapsulate tenant isolation, client self-cancellation constraints, ticket scoping, and admin authorization rules.
* **Category Routing [RESOLVED]**: Introduced `IAssignmentStrategy` interface and `RoundRobinAssignmentStrategy` (`server/src/services/strategies/AssignmentStrategy.ts`), enabling open-ended assignment strategy extensions.

### Dependency Inversion Principle (DIP)
* **Direct Concrete Imports & Repository Boundaries [RESOLVED]**:
  - `NotificationController.ts` interacts exclusively with `NotificationService` methods (`getUserNotifications`, `markAsRead`, `markAllAsRead`, `clearAllForUser`).
  - `SubscriptionController.ts` delegates client tenant resolution to `subscriptionService.getClientTenantId()`.
* **Direct ORM Coupling [RESOLVED]**: Created `RoundRobinRepository` (`server/src/repositories/RoundRobinRepository.ts`) to encapsulate Drizzle ORM operations on `round_robin_state`. `AssignmentService` now depends strictly on `IAssignmentStrategy` and `RoundRobinRepository`.

### Function & Naming Smells
* **Long Functions (>20 lines) [RESOLVED]**: Refactored long functions across `TicketService.ts`, `InvoiceService.ts`, `SubscriptionService.ts`, and `checkout-sheet.tsx` into small, focused single-responsibility helper methods (<20 lines).
* **Excessive Parameter Counts (>3 arguments) [RESOLVED]**:
  - Consolidated `userId`, `userRole`, `tenantId` parameters into a single typed `UserContext` parameter object (`type UserContext = { userId: string; role: UserRole; tenantId: string }`) across `TicketService.ts` and `TicketController.ts`.
  - Grouped 14 props in `checkout-sheet.tsx` into structured `CheckoutSheetProps` interfaces.
* **Command-Query Separation (CQS) Violations [RESOLVED]**:
  - `InvoiceService.getClientInvoices`: Isolated line item calculation into dedicated helper methods and removed inline state mutations.
  - `TicketService.getTicketById`: Read queries now perform access checks via `TicketAccessPolicy` without throwing unexpected inline exceptions.
* **Dirty Comments & Error Swallowing [RESOLVED]**:
  - Replaced silent `catch {}` block in `InvoiceService.getClientInvoices` with explicit `logger.warn` logging.
  - Cleaned up unfulfilled `// TODO` comments in `server/src/utils/whatsappService.ts` and `server/src/services/AuthService.ts`.

---

## ⛺ Refactoring Accomplishments (Boy Scout Rule)

All prioritized refactoring targets identified in the initial audit have been refactored, tested, and verified:

1. **`server/src/services/AssignmentService.ts` [COMPLETED]**:
   - Encapsulated `round_robin_state` Drizzle ORM queries inside `RoundRobinRepository`. Removed direct `db` import from service layer. Introduced `IAssignmentStrategy`.
2. **`server/src/controllers/NotificationController.ts` & `SubscriptionController.ts` [COMPLETED]**:
   - Eliminated repository bypasses in controllers by routing all operations through `NotificationService` and `SubscriptionService`.
3. **`server/src/services/InvoiceService.ts` & `SubscriptionService.ts` [COMPLETED]**:
   - Extracted `InvoicePdfService`, `InvoiceNotificationService`, and `SubscriptionQuotationService`. Replaced silent error swallows with explicit logger warnings.
4. **`client/src/components/checkout-sheet.tsx` [COMPLETED]**:
   - Extracted static Dominican bank account dataset to `client/src/constants/bankAccounts.tsx`. Separated UI into `OrderSummary` and `PaymentFields`.
5. **`server/src/services/TicketService.ts` [COMPLETED]**:
   - Introduced `UserContext` parameter object to eliminate parameter bloat and extracted quota checks into `TicketQuotaService`.

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

## ⛺ Boy Scout Refactoring Targets

Prioritized cleanup targets that future agents must refactor before implementing new feature code:

1. **`server/src/services/AssignmentService.ts` [CRITICAL]**:
   - *Issue*: Direct DB import (`import { db, roundRobinState } from '../db'`) and raw ORM queries inside service layer.
   - *Refactoring Target*: Create `RoundRobinRepository` in `server/src/repositories/RoundRobinRepository.ts` to encapsulate `round_robin_state` table queries. Inject or call `RoundRobinRepository` from `AssignmentService`.

2. **`server/src/controllers/NotificationController.ts` & `SubscriptionController.ts` [HIGH]**:
   - *Issue*: Controllers bypass Service layer to call repositories directly (`notificationRepository`, `userRepository`).
   - *Refactoring Target*: Introduce service layer methods in `NotificationService` (`getUserNotifications`, `markAsRead`, `clearAll`) and move user lookups into `SubscriptionService`. Ensure controllers ONLY call services.

3. **`server/src/services/InvoiceService.ts` & `SubscriptionService.ts` [HIGH]**:
   - *Issue*: 500+ line god classes violating SRP, mixing domain rules with PDF generation, PayPal API, Nodemailer, and silent error swallowing (`try {} catch {}`).
   - *Refactoring Target*: Extract `InvoicePdfService`, `BillingNotificationService`, and `PaypalPaymentHandler`. Replace silent catch blocks with explicit error logging or custom error boundaries.

4. **`client/src/components/checkout-sheet.tsx` [HIGH]**:
   - *Issue*: 14-prop parameter bloat on `CheckoutSheetProps`, inline static Dominican bank account dataset, inline tax calculations.
   - *Refactoring Target*: Move static bank account definitions to `client/src/constants/bankAccounts.ts`. Refactor state into a Zustand store or custom hook (`useCheckoutFlow`). Group related props into a `CheckoutContext` object.

5. **`server/src/services/TicketService.ts` [MEDIUM]**:
   - *Issue*: Parameter bloat (methods taking 4-6 parameters) and dual responsibility in `enforceTicketLimit`.
   - *Refactoring Target*: Combine `userId`, `userRole`, `tenantId` into a single typed context parameter: `type UserContext = { userId: string; role: UserRole; tenantId: string }`. Extract quota validation into a dedicated `TicketQuotaService`.

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
├── pages/          # Page Views: Top-level route views
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
   - **Forbidden Imports**: Raw unstyled HTML primitives (`<button>`, `<input>`, `<select>`, `<dialog>`) when a `shadcn/ui` primitive is available.
