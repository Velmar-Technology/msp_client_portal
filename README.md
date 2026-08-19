# MSP Help Desk — Client Portal

A multi-tenant **Modular Monolith** Help Desk and Infrastructure Management client portal built on the **PERN stack** (PostgreSQL, Express, React, Node.js) with TypeScript, Drizzle ORM, Vite, and Tailwind CSS v4.

---

## Architecture & Clean Architecture Principles

The codebase strictly adheres to **Uncle Bob’s Clean Architecture & Clean Code principles**. Source code dependencies strictly point **INWARD** toward high-level domain entities and business rules:

```
[ Frameworks & Drivers (DB, Express, UI) ]
            │
            ▼
[ Interface Adapters (Controllers, Repositories, Client Services) ]
            │
            ▼
[ Use Cases (Services: TicketService, InvoiceService, etc.) ]
            │
            ▼
[ Entities (Domain Types & Drizzle Schemas) ]
```

### Layer Boundaries & Directory Structure

```
server/src/
├── shared/                         # Cross-cutting infrastructure & utilities
│   ├── db/                         # Drizzle connection pool, schemas & migrations
│   ├── dtos/                       # Data Transfer Objects
│   ├── middleware/                 # Express middleware (auth, gateway, rate limiting)
│   ├── policies/                   # Access control policy definitions
│   ├── repositories/               # Shared base repositories (BaseRepository.ts)
│   ├── types/                      # Primitive entity interfaces & enums
│   └── utils/                      # Shared utility drivers (logger, passwordUtils, pdfGenerator)
│
└── modules/                        # Business Domain Bounded Contexts
    ├── auth/                       # Controllers, Repositories, Routes, Services & Co-located Tests
    ├── tickets/                    # Controllers, Repositories, Routes, Services & Co-located Tests
    ├── billing/                    # Controllers, Repositories, Routes, Services & Co-located Tests
    ├── subscriptions/              # Controllers, Repositories, Routes, Services & Co-located Tests
    ├── rmm/                        # Controllers, Repositories, Routes, Services & Co-located Tests
    ├── equipment/                  # Controllers, Repositories, Routes, Services & Co-located Tests
    ├── notifications/              # Controllers, Repositories, Routes, Services & Co-located Tests
    └── system/                     # Controllers, Repositories, Routes, Services & Co-located Tests

client/src/
├── components/ui/  # MANDATORY UI Primitives: Base shadcn/ui components
├── components/     # Feature Components: Must use shadcn/ui primitives
├── routes/         # Layout Routes: File-based layout route hierarchy (_public/, _auth/, _app/)
├── pages/          # Top-Level Page Views
├── services/       # API Adapters: Axios HTTP client services
└── store/          # Application State: Zustand stores
```

---

## Multi-Tenant Architecture & Database

This portal uses a **Shared Database, Shared Schema** multi-tenant model. All client data is partitioned logically using indexed `tenant_id` foreign keys referencing `tenants(id) ON DELETE CASCADE`.

### User Roles & Isolation Scopes

1. **Tenants (`tenants` table):** Client organizations (e.g., Acme Corp) or the Service Provider (`MSP Provider`).
2. **Client Users (`CLIENT` role):** Restricted strictly to their `tenant_id`. They can only view/manage their own organization's tickets, subscriptions, and invoices.
3. **Staff Users (`ADMIN` & `TECHNICIAN` roles):** Belong to the MSP provider tenant with cross-tenant administrative access to manage tickets, dispatch technicians, and handle billing globally.

### Partitioned Tables

- `users`
- `tickets`
- `subscriptions`
- `invoices`
- `ticket_attachments`
- `ticket_events`

---

## Master Business Logic Specifications

### Module 1: Support, Routing & Escalation Engine

- **BL-101: 1-Hour SLA Cancellation Rule** (`TicketService.enforceSLARule`)
  - Tickets in `WARRANTY` or `SERVICE_OUTAGE` categories can only be cancelled within 60 minutes ($\text{SLA\_WINDOW\_MS} = 3,600,000$) of creation. Late cancellation attempts throw `AppError.slaViolation`.
- **BL-102: Round-Robin Dispatch with Specialty Fallback** (`AssignmentService.getNextTechnician`)
  - Distributes tickets equitably per category. Fallback chain: Active Category Specialists $\rightarrow$ General Active Technician Pool.
- **BL-103: Alert Noise Reduction & Auto-Remediation** (`AlertService.processRMMAlert`)
  - Deduplicates RMM alerts within a 15-minute window for the same asset. Auto-closes resolved issues within 300 seconds as `RESOLVED_AUTOMATED`.
  - **Flapping Override:** Alerts triggering $\ge 3$ times within a rolling 24-hour window bypass auto-close, open a `PREVENTATIVE_MAINTENANCE` ticket tagged `[FLAPPING_ALERT]`, and route to Tier 2.
- **BL-104: Time-Based Tier Escalation** (`TicketService.enforceEscalation`)
  - Unworked tickets escalate to Tier 2 when priority thresholds are exceeded: CRITICAL = 10m, HIGH = 20m, MEDIUM = 45m, LOW = 120m. Uses `CapacityWeightedAssignmentStrategy` (weighted load: P1=4.0, P2=2.0, P3=1.0, P4=0.5).
- **Key Metrics:**
  - **NRR** (Noise Reduction Ratio) $= \frac{\text{TotalAlerts} - \text{HumanTouchTickets}}{\text{TotalAlerts}}$
  - **SHE** (Self-Healing Efficiency) $= \frac{\text{AutoClosed}}{\text{AutoClosed} + \text{FlappingOverrides}}$
  - **$FCR_A$** (Automated First Contact Resolution) $= \frac{\text{AutomatedResolved}}{\text{TotalTicketsIngested}}$

### Module 2: Subscriptions, Licensing & True-Ups

- **BL-201: Plan Feature Quotas** (`TicketService.enforceTicketLimit`)
  - Blocks ticket creation with `AppError.forbidden` (`TICKET_LIMIT_EXCEEDED`) when client plan limits are reached.
- **BL-202: Automated License True-Up** (`SubscriptionService.reconcileSeats`)
  - Reconciles cloud user seats (e.g. M365) and RMM agents against contracts to automatically update billable quantity ($Q_{\text{billed}}$).
- **BL-203: Out-of-Scope Project Guardrails** (`TicketService.enforceScope`)
  - Shifts out-of-scope requests (hardware moves, site setups) to `PENDING_ESTIMATE` pending client authorization.

### Module 3: Access Control & Ticket State Machine

- **BL-301: Ticket State Machine & RBAC** (`TicketService.updateTicketStatus`)
  - All status transitions must comply with the `STATUS_TRANSITIONS` state matrix.
  - Multi-tenant RBAC enforces isolation: Clients are limited to `CANCELLED` status changes; Technicians manage assigned tickets; Admins hold global permissions.

### Module 4: Billing Automation & Invoicing Lifecycle

- **BL-401: Automatic Subscription Reactivation** (`InvoiceService.capturePaypalOrder`, `InvoiceService.markAsPaid`)
  - Successful PayPal capture or manual payment updates invoice to `PAID` and immediately reactivates all `EXPIRED` client subscriptions to `ACTIVE`.
- **BL-402: Recurring Renewal Scheduler** (`SubscriptionScheduler.processSubscriptions`)
  - Background cron process scanning active subscriptions, applying hardware multipliers ($M_{\text{equip}}$), generating invoices, and emailing billing notices.
- **BL-403: Manual Wire Transfer & Offline Payment Validation** (`InvoiceService.markAsPaid`)
  - Admins can mark bank/wire transfers as `PAID` without PayPal API dependencies, automatically reactivating expired subscriptions.

### Module 5: Account Health & QBR Logic

- **BL-501: Composite Client Health Scoring** (`ClientHealthService.calculateScore`)
  - Health Formula:
    $$H = 0.40 \times S_{\text{ticket}} + 0.30 \times S_{\text{hardware}} + 0.30 \times S_{\text{security}}$$
  - Accounts scoring below $70\%$ flag the vCIO to schedule a Quarterly Business Review (QBR).

---

## Core Data Journeys & Command-Query Separation (CQS)

### Journey 1: Ticket Creation & Auto-Assignment

1. **Inputs:** Client posts `CreateTicketInput` payload to `POST /api/tickets`.
2. **Execution:**
   - _Query:_ `TicketService.enforceTicketLimit` checks active client subscriptions and monthly ticket count.
   - _Command:_ `ticketRepository.create` inserts ticket with `OPEN` status.
   - _Command:_ `ticketEventRepository.create` logs audit event.
   - _Command:_ `assignmentService.getNextTechnician` calculates assigned technician via round-robin and updates `round_robin_state`.
   - _Side Effect:_ `notificationService.onTicketCreated` triggers email and in-app alerts.
3. **Outputs:** Ticket inserted, assigned tech set, HTTP 201 response.

### Journey 2: Ticket Cancellation & SLA Validation

1. **Inputs:** Client sends `{ status: "CANCELLED" }` via `PATCH /api/tickets/:id/status`.
2. **Execution:**
   - _Query & Validation:_ Verifies tenant match and owner rights. Checks transition rules.
   - _SLA Rule:_ For `WARRANTY` or `SERVICE_OUTAGE`, verifies `Date.now() - ticket.created_at <= 1 hour`. Throws `slaViolation` if exceeded.
   - _Command:_ `ticketRepository.updateStatus` sets status to `CANCELLED`.
   - _Command:_ `ticketEventRepository.create` logs audit entry.
3. **Outputs:** Ticket cancelled, HTTP 200 returned.

### Journey 3: Invoice Payment & Subscription Activation

1. **Inputs:** Client captures PayPal order via `POST /api/invoices/:id/capture-paypal` OR Admin validates wire transfer via `POST /api/invoices/:id/mark-paid`.
2. **Execution:**
   - _Command:_ `invoiceRepository.updateStatus(id, 'PAID')`.
   - _Command:_ `activateExpiredSubscriptionsForClient` updates linked `EXPIRED` client subscriptions to `ACTIVE`.
   - _Command:_ `notificationService.createInAppNotification` alerts client and admins.
3. **Outputs:** Invoice status `PAID`, subscriptions `ACTIVE`, HTTP 200 returned.

---

## Code Quality & Engineering Standards

- **The Boy Scout Rule:** Always leave code cleaner than you found it.
- **The Three Rules of TDD:** Write production code only to fix a failing test; write only enough of a test to fail; write only enough production code to pass.
- **S.O.L.I.D. Principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **Clean Code & CQS:** Short functions (4–20 lines), clear intention-revealing names, command-query separation (methods either mutate state or return data, never both). Code must explain itself without redundant comments.

---

## CI/CD Pipeline & VPS Deployment Guide

Continuous Integration and Deployment is automated via GitHub Actions ([.github/workflows/deploy.yml](file:///.github/workflows/deploy.yml)).

```
┌─────────────────────────┐
│ Git Push Tag (v*) or    │
│ Manual Dispatch Trigger │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐     Build & Push     ┌────────────────────────┐
│  Build & Push Job       ├─────────────────────►│ GitHub Container       │
│  (Docker Buildx)        │                      │ Registry (ghcr.io)     │
└────────────┬────────────┘                      └───────────┬────────────┘
             │                                               │
             ▼                                               │ Pull latest
┌─────────────────────────┐    Copy Compose via SCP          │ Docker images
│  Deploy to VPS Job      ├──────────────────────────┐       │
└─────────────────────────┘                          │       ▼
                                                     ▼────────────────────┐
                                                     │ Target VPS Host    │
                                                     │ (docker compose up)│
                                                     └────────────────────┘
```

### 1. GitHub Actions Workflow Trigger

- **Automated Trigger:** Pushing a version tag matching `v*` (e.g. `v1.2.0`).
- **Manual Trigger:** `workflow_dispatch` trigger with optional custom `releaseVersion` input.

### 2. Build & Push Docker Images Job (`build-and-push`)

- Computes release version from tag, dispatch input, or `client/package.json`.
- Log in to **GitHub Container Registry (`ghcr.io`)**.
- Builds and pushes backend server Docker image (`server/Dockerfile`) with tags:
  - `ghcr.io/<owner>/msp-services-server:latest`
  - `ghcr.io/<owner>/msp-services-server:<sha>`
  - `ghcr.io/<owner>/msp-services-server:<version>`
- Validates secrets (`VITE_GOOGLE_CLIENT_ID`, `VITE_PAYPAL_CLIENT_ID`).
- Builds and pushes frontend client Docker image (`client/Dockerfile`) passing build args (`VITE_GOOGLE_CLIENT_ID`, `VITE_APP_VERSION`, `VITE_PAYPAL_CLIENT_ID`) with tags:
  - `ghcr.io/<owner>/msp-services-client:latest`
  - `ghcr.io/<owner>/msp-services-client:<sha>`
  - `ghcr.io/<owner>/msp-services-client:<version>`

### 3. VPS Deployment Job (`deploy`)

- **SCP Transfer:** Transfers `docker-compose.prod.yml` to `~/msp-client-portal` on VPS via SSH (`appleboy/scp-action`).
- **SSH Deployment:** Executes remote deployment commands (`appleboy/ssh-action`):
  ```bash
  mkdir -p ~/msp-client-portal
  cd ~/msp-client-portal
  echo "${GITHUB_TOKEN}" | docker login ghcr.io -u ${ACTOR} --password-stdin
  export REPOSITORY_OWNER=${OWNER_LC}
  export VERSION=${RELEASE_VERSION}
  docker compose -f docker-compose.prod.yml pull
  docker compose -f docker-compose.prod.yml up -d
  docker logout ghcr.io
  ```

---

## 💻 Local Setup & Development

### Database Configuration & Setup

1. **Environment Variables:**
   Copy `server/.env.example` to `server/.env` and configure PostgreSQL credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

2. **Database Migrations:**

   ```bash
   # From project root:
   npm run db:migrate --prefix server
   # Run multi-tenancy schema migration script:
   npx tsx server/src/shared/db/apply_migration_003.ts
   ```

3. **Database Seeding:**
   ```bash
   npm run db:seed --prefix server
   ```

### Drizzle Kit CLI Commands (From `server/` directory)

- **Drizzle Studio Inspector:** `npx drizzle-kit studio`
- **Generate SQL Migrations:** `npx drizzle-kit generate`
- **Push Schema Direct to DB:** `npx drizzle-kit push`

### Running Development Servers

1. **Backend Server (Port 3001):**
   ```bash
   npm run dev --prefix server
   ```
2. **Frontend Client (Port 5173):**
   ```bash
   npm run dev --prefix client
   ```

---

## 🎨 UI Primitives & Skeleton Loaders

The frontend relies on **shadcn/ui** primitives located in `client/src/components/ui/`. Modern structural skeleton loaders replace standard loading spinners for enhanced perceived performance:

- **Skeleton Primitive:** [skeleton.tsx](file:///c:/Users/Public/Workspace/msp_client_portal/client/src/components/ui/skeleton.tsx)
- **DataTable Skeleton:** [data-table.tsx](file:///c:/Users/Public/Workspace/msp_client_portal/client/src/components/ui/data-table.tsx) displays skeleton rows matching table structure when `loading` is active.
- **Ticket Detail Skeleton:** [TicketDetailPage.tsx](file:///c:/Users/Public/Workspace/msp_client_portal/client/src/pages/TicketDetailPage.tsx) renders layout grid skeletons during asynchronous data fetches.

---

## 📖 API Documentation

Interactive Swagger API documentation is available when the server is running:

- **Direct Backend URL:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **API v1 Endpoint URL:** [http://localhost:3001/api/v1/api-docs](http://localhost:3001/api/v1/api-docs)
- **Frontend Proxy URL (Dev):** [http://localhost:5173/api-docs](http://localhost:5173/api-docs)
