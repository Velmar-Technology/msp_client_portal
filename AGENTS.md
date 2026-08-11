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

## 💼 Enforced Business Logic & Rules

The domain and use-case layers enforce the following non-negotiable business rules:

* **Rule**: **1-Hour SLA Cancellation Rule** — Tickets in the `WARRANTY` or `SERVICE_OUTAGE` categories can ONLY be cancelled within 60 minutes (`SLA_WINDOW_MS = 3600000`) of creation. Cancellation attempts after 60 minutes throw an SLA violation error (`AppError.slaViolation`). Enforced in `TicketService.enforceSLARule`.
* **Rule**: **Subscription Plan Ticket Quota Rule** — Ticket creation validates client subscription feature caps (`HELPDESK_SUPPORT`). If the plan specifies a numeric limit (e.g. 5 tickets/device/month or 10 tickets/account/month), ticket creation is blocked once that threshold is reached (`AppError.forbidden` with code `TICKET_LIMIT_EXCEEDED`). Enforced in `TicketService.enforceTicketLimit`.
* **Rule**: **Round-Robin Technician Assignment with Specialty Fallback** — Automated technician assignment equitably distributes tickets using round-robin state tracked per ticket category. If a specialty is specified, the system filters for specialist technicians first; if none are available, it falls back to the general active technician pool. Enforced in `AssignmentService.getNextTechnician`.
* **Rule**: **Strict Ticket State Machine & Access Scoping** — Status transitions must conform to the allowed matrix defined in `STATUS_TRANSITIONS`. Clients can only change ticket status to `CANCELLED` and can only view/modify tickets matching their `tenant_id`. Technicians can only view assigned tickets. Admin users possess global access. Enforced in `TicketService.updateTicketStatus` and `TicketService.getTickets`.
* **Rule**: **Automatic Subscription Reactivation on Payment** — Successfully capturing a PayPal order or manually marking an invoice as `PAID` automatically updates all `EXPIRED` client subscriptions back to `ACTIVE` and triggers in-app notifications to both the client and all administrators. Enforced in `InvoiceService.capturePaypalOrder` and `InvoiceService.markAsPaid`.
* **Rule**: **Automated Subscription Renewal & Billing** — The `SubscriptionScheduler` background process periodically scans active subscriptions, checks expiration dates, calculates equipment multipliers, creates recurring invoices in PostgreSQL, and dispatches email notifications. Enforced in `SubscriptionScheduler.processSubscriptions`.

---

## 🧩 SOLID & Clean Code Audit

### Single Responsibility Principle (SRP)
* **`server/src/services/InvoiceService.ts` (541 lines)**: Violates SRP. Manages invoice querying, line-item price calculation, PayPal order creation/capture, subscription status activation, PDF generation, email dispatching, and multi-role notification creation.
* **`server/src/services/SubscriptionService.ts` (600 lines)**: Violates SRP. Combines subscription CRUD, plan validation, ticket limit checking, PayPal webhook processing, and billing statement generation.
* **`server/src/services/TicketService.ts` (468 lines)**: Violates SRP. Combines ticket persistence, SLA calculation, subscription quota validation, round-robin assignment invocation, event timeline logging, file attachment storage, and notification dispatching.
* **`client/src/components/checkout-sheet.tsx` (468 lines)**: Violates SRP. Combines UI layout, Dominican bank static definitions, subtotal/tax calculations, copy-to-clipboard logic, TOS agreement state, and payment execution.

### Open/Closed & Liskov Substitution Principles (OCP / LSP)
* **Role-Based Conditional Branching**: Widespread `if (userRole === UserRole.CLIENT) ... else if (userRole === UserRole.TECHNICIAN)` conditionals across services and controllers make adding new roles rigid, requiring modifications to core methods rather than extending polymorphic role policies.
* **Category Routing**: `AssignmentService` uses string-based category filtering rather than an open-ended assignment strategy registry.

### Dependency Inversion Principle (DIP)
* **Direct Concrete Imports**: High-level modules import concrete exported singletons (`import { ticketRepository } from '../repositories/TicketRepository'`, `import { paypalService } from './PaypalService'`) instead of depending on injected interfaces. This forces tests to rely on module mocking (`vi.mock(...)`) rather than dependency injection.
* **Direct ORM Coupling**: `AssignmentService` imports `db` directly from `../db`.

### Function & Naming Smells
* **Long Functions (>20 lines)**:
  - `TicketService.updateTicketStatus` (76 lines): Manages access validation, state transition matrix checks, SLA window evaluation, status updates, event logging, and notification creation.
  - `TicketService.enforceTicketLimit` (55 lines): Queries subscriptions, parses feature arrays, handles NaN fallbacks, counts equipment/client tickets, and throws errors.
  - `InvoiceService.getClientInvoices` (46 lines): Fetches raw invoices, queries related subscriptions, matches closest creation timestamp, and calculates line-item prices inline.
  - `InvoiceService.capturePaypalOrder` (48 lines): Validates invoice state, captures PayPal payment, updates DB status, reactivates expired subscriptions, and sends notifications.
  - `checkout-sheet.tsx` main component (>300 lines): Huge UI render function with embedded helper components and state variables.
* **Excessive Parameter Counts (>3 arguments)**:
  - `TicketService.addTicketResponse`: 6 parameters (`ticketId`, `message`, `userId`, `userRole`, `tenantId`, `files`).
  - `TicketService.updateTicketStatus`: 5 parameters (`ticketId`, `data`, `userId`, `userRole`, `tenantId`).
  - `TicketService.addAttachment`: 5 parameters (`ticketId`, `file`, `userId`, `userRole`, `tenantId`).
  - `TicketService.getTicketById`: 4 parameters (`ticketId`, `_userId`, `userRole`, `tenantId`).
  - `TicketService.getTickets`: 4 parameters (`filters`, `userId`, `userRole`, `tenantId`).
  - `CheckoutSheetProps` in `checkout-sheet.tsx`: **14 props**!
* **Command-Query Separation (CQS) Violations**:
  - `InvoiceService.getClientInvoices`: Intended as a read Query, but executes complex inline state transformations and subscription date matching.
  - `TicketService.getTicketById`: Intended as a read Query, but performs side-effect access control assertions throwing HTTP exceptions.
* **Dirty Comments & Error Swallowing**:
  - Silent error swallow in `InvoiceService.ts`: `try { ... } catch { // Silently fall through — line_items will be undefined }`.
  - Unimplemented TODO comments in `server/src/utils/whatsappService.ts` (`// TODO: Replace with actual WhatsApp API integration`) and `server/src/services/AuthService.ts` (`// TODO: Send email with reset link containing the token`). Uncle Bob: *"Don't comment bad code or missing code — write the implementation or delete the comment."*

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
1. **Triggers/Inputs**: Client submits `{ paypalOrderId }` via `POST /api/invoices/:id/capture-paypal`.
2. **Execution (Command vs Query)**:
   - *Query*: `InvoiceService.getInvoiceById` retrieves invoice and checks that `status !== 'PAID'`.
   - *External Command*: `paypalService.captureOrder(paypalOrderId)` captures funds via PayPal REST API.
   - *Command (Mutation)*: `invoiceRepository.updateStatus(id, 'PAID')` updates invoice in DB.
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
