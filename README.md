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
│   └── utils/                      # Shared utility drivers (logger, passwordUtils, pdfGenerator, cache)
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
├── email-templates/# Master Email Design System & transactional email templates
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

### Module 3: Access Control, SOTA Hybrid Authorization & State Machine

- **BL-301: Ticket State Machine & RBAC** (`TicketService.updateTicketStatus`, `TicketAccessPolicy`)
  - All status transitions must comply with the `STATUS_TRANSITIONS` state matrix.
  - Multi-tenant RBAC enforces isolation: Clients are limited to `CANCELLED` status changes; Technicians manage assigned tickets; Admins hold global permissions.

- **BL-302: SOTA Hybrid Authorization & Zero Standing Privileges (PoLP / ZSP Engine)** (`HybridPolicyEngine`, `ZanzibarTupleStore`, `EphemeralAccessService`, `WorkloadIdentityService`, `ContinuousAdaptiveTrustService`, `PolicyAsCodeEngine`, `constants.ts`)
  - **Zero Standing Privileges & JIT Access (`EphemeralAccessService`):** Eliminates 24/7 root access. Standard engineer accounts hold minimal base privileges. Temporary break-glass access packages are requested on-demand (`1` to `480` minutes TTL) with mandatory business justifications, dynamically injected into the Zanzibar relation graph, and auto-purged upon expiration.
  - **Continuous Right-Sizing via AI Role Mining (`ContinuousAdaptiveTrustService.mineRoles`):** Unsupervised clustering analyzing telemetry streams (`EntitlementLog`). Detects entitlement drift ($>40\%$ unused capabilities) and generates automated pull-request pruning diffs (`PruningPatchDiff`) to trim standing permissions down to active operational requirements.
  - **Workload Identity & Machine-to-Machine PoLP (`WorkloadIdentityService`):** Eliminates static API keys and long-lived database credentials for non-human workloads (RMM agents, background workers, AI agents, CI/CD). Issues cryptographically signed (HMAC-SHA256), short-lived (5m default TTL) SPIFFE tokens (`spiffe://msp.portal/tenant/{tenantId}/{type}/{id}`) with strict action and resource-prefix narrowing.
  - **Contextual & Behavioral Step-Up Authentication (`ContinuousAdaptiveTrustService`, `HybridPolicyEngine`):** Continuous multi-vector risk evaluation (data spikes $>50\text{MB}$, request velocity bursts, impossible geographic travel, unmanaged/non-compliant devices, and anomalous off-hours activity). Medium/High risk dynamically triggers Step-Up MFA challenges without terminating legitimate workflows.
  - **Layer 1 (RBAC Baseline):** Evaluates coarse actor classification (`CLIENT`, `TECHNICIAN`, `ADMIN`) and action boundary mappings.
  - **Layer 2 (ReBAC / Zanzibar):** Resolves fine-grained relationship graph tuples (`<subject>#<relation>@<object>`) with hierarchical inheritance (`owner` $\rightarrow$ `editor` $\rightarrow$ `viewer`).
  - **Layer 3 (ABAC / PaC):** Evaluates declarative Policy-as-Code rules, temporal SLA windows (`BL-101`), and Non-Payment account tier restrictions (`BL-702`).
  - **AI / RAG Vector ACLs (`VectorAclService`):** Dual-phase security generating database pre-retrieval SQL/pgvector `WHERE` clauses and post-retrieval chunk sanitization.
  - **Centralized Constants (`constants.ts`):** Single source of truth for JIT limits, risk scoring weights, risk thresholds, telemetry thresholds, role mining boundaries, and workload identity token lifetimes.

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

### Module 6: Rates, Invoicing (NCF), Taxes (ITBIS) & Non-Payment System (Section 9)

- **BL-701: Dominican Tax Compliance & NCF Series B01** (`NcfService.assignNcfIfEligible`, `BillingPricingService.calculatePricing`)
  - Rates in USD or DOP apply eighteen percent (18%) ITBIS tax on invoice subtotal.
  - Automatically issues valid sequential Series B01 Tax Credit Invoices (`B0100000001` - `B0199999999`) when client or tenant registers a valid DGII Modulo 11 (RNC) or Modulo 10 Luhn (Cédula).
- **BL-702: 4-Tier Non-Payment Suspension Scale** (`NonPaymentSuspensionService.evaluateOverdueAccounts`)
  - **Day 1 Overdue:** Automated electronic collection notification email and in-app alert.
  - **Day 5 Overdue:** Account changes to `READ_ONLY` mode (ticket creation, replies, and file uploads blocked).
  - **Day 15 Overdue:** Full platform access and technical support suspended (`account_status = 'SUSPENDED'`, `is_active = false`).
  - **Day 30 Overdue:** Permanent technical purge and deletion of data from servers for storage liberation with zero liability to the company (`account_status = 'PURGED'`). Purges Nextcloud storage accounts and hardware bindings.
  - **Restoration:** Payment capture automatically restores tenant and all users to `ACTIVE`.

### Module 7: Technician Commissions, Pre-Split OpEx & Profit Distribution

- **BL-801: Closed-Ticket Commission & Holdback Subsystem** (`TechnicianEarningsService.calculateAndRecordEarnings`)
  - Closed tickets yield a per-ticket commission: Base rate ($8.00 USD) $\times$ priority multiplier (LOW: 1.0x, MEDIUM: 1.25x, HIGH: 1.75x, CRITICAL: 2.5x) $+$ SLA bonus ($4.00 USD if resolved within target business hours).
  - Automatically posted as a Pre-Split Operating Expense (`Labor & Technician Commissions`) in the `expenses` ledger upon `RESOLVED`/`CLOSED`.
  - Automated resolutions (`RESOLVED_AUTOMATED`) yield $0 commission.
  - 48-hour holdback (`PENDING` state). If a ticket is reopened during holdback, `voidEarningsForReopenedTicket` marks the earning `VOIDED`.
- **BL-802: 70/30 Net Revenue & Profit Split Model** (`FinancialStatsService`)
  - Net Profit Pool $= \text{Gross Paid Invoices} - \text{Total Operating Expenses}$ (which includes technician labor commissions).
  - Profit is split: **70% to HQ Company** (which absorbs 70% of technician commission expenses) and **30% to Lead Engineer / Admin**.

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

### Journey 4: Ticket Resolution, Commission OpEx & Batch Payout

1. **Inputs:** Technician marks ticket `RESOLVED` or `CLOSED` via `PATCH /api/v1/tickets/:id/status`.
2. **Execution:**
   - _Command:_ `TicketStatusService.updateStatus` transitions ticket.
   - _Command:_ `TechnicianEarningsService.calculateAndRecordEarnings` calculates rate $\times$ priority multiplier $+$ SLA bonus.
   - _Command:_ Automatically inserts Pre-Split OpEx entry into `expenses` (`category = 'Labor & Technician Commissions'`).
   - _Command:_ Inserts ledger row into `technician_earnings`.
   - _Admin Payout:_ Admin submits batch approval via `POST /api/v1/system/technicians/earnings/payout`, transitioning selected records to `PAID`.
3. **Outputs:** Ticket resolved, bounty logged as OpEx, visible on Tech Dashboard & Admin Payroll table.

---

## Code Quality & Engineering Standards

- **The Boy Scout Rule:** Always leave code cleaner than you found it.
- **The Three Rules of TDD:** Write production code only to fix a failing test; write only enough of a test to fail; write only enough production code to pass.
- **S.O.L.I.D. Principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **Clean Code & CQS:** Short functions (4–20 lines), clear intention-revealing names, command-query separation (methods either mutate state or return data, never both). Code must explain itself without redundant comments.

---

## CI/CD Pipeline & VPS Deployment Guide

Continuous Integration and Deployment is automated via GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)). Deployment is **Portainer-owned**: CI builds images, pushes them to GitHub Container Registry, and updates the production stack through the Portainer REST API — it no longer shells out to `docker compose up` on the host.

```
┌──────────────────────────────┐
│ Git Push Tag (v*) or         │
│ Manual Dispatch (workflow)   │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────────────┐
│ prepare → quality-gates              │
│   (lint · typecheck · tests)         │
│ build-server + build-client          │
│   → ghcr.io :<version>/:<sha>/:latest│
│ security-scan (Trivy HIGH/CRITICAL)  │
│ build-agent-binaries + create-release│
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────────────────────┐
│ deploy-production (environment approval gate)         │
│ 1. capture rollback point (running msp_server_prod)   │
│ 2. pre-warm GHCR pulls on VPS (SSH)                   │
│ 3. portainer-stack-update.sh <VERSION>                │
│ 4. health verify /api/v1/health (12×5s)               │
│ 5. auto-rollback → previous VERSION on failure        │
└──────────────┬───────────────────────────────────────┘
               ▼
          notify (webhook)
```

### 1. GitHub Actions Workflow Trigger

- **Automated Trigger:** Pushing a version tag matching `v*` (e.g. `v1.2.0`).
- **Manual Trigger:** `workflow_dispatch` with optional `releaseVersion` input (plus a `skipSecurityGate` override).

### 2. Build & Push Docker Images

- `prepare` resolves the release version (tag → dispatch input → `client/package.json`).
- `quality-gates` (lint/typecheck/tests) must pass before anything ships.
- **Server** (`server/Dockerfile`) and **Client** (`client/Dockerfile`) are built with Docker Buildx (SBOM + OCI provenance) and pushed to GHCR with tags `:<version>`, `:<sha>`, `:latest`:
  - `ghcr.io/<owner>/msp-services-server:...`
  - `ghcr.io/<owner>/msp-services-client:...`
  - Client build args are baked at compile time: `VITE_GOOGLE_CLIENT_ID`, `VITE_APP_VERSION`, `VITE_PAYPAL_CLIENT_ID`, `VITE_DD_*`.
- `security-scan` runs Trivy — HIGH/CRITICAL CVEs block release (SARIF uploaded; bypassable per-run or via the `DISABLE_SECURITY_GATE` repo variable).

### 3. Production Deployment via Portainer (`deploy-production`)

- **Approval gate:** Runs in the `production` GitHub Environment (required reviewers); URL `https://helpdesk.velmartech.com.do`.
- **Rollback point:** Captures the currently-running `msp_server_prod` image tag from the Portainer Docker API.
- **Pre-warm:** Pulls the new server/client images on the VPS over SSH to shrink the synchronous Portainer update window (best-effort; needs a one-time `docker login ghcr.io` with a `read:packages` PAT).
- **Stack update:** `bash scripts/portainer-stack-update.sh "${VERSION}"` submits the repo-owned `docker-compose.prod.yml` with a pinned `VERSION` to Portainer (`PUT /api/stacks/:id?endpointId=:id`, `prune:true`, `pullImage:true`).
- **Health gate:** `docker exec msp_server_prod node -e "fetch('http://127.0.0.1:3001/api/v1/health')…"` — up to 12 attempts.
- **Auto-rollback:** On update or health failure, re-pins the previous `VERSION` through the same script and re-verifies.
- **Required secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `PORTAINER_URL`, `PORTAINER_API_KEY`, `PORTAINER_ENDPOINT_ID` (`3`), `PORTAINER_STACK_ID` (`17`), `VITE_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_ID`, `VITE_PAYPAL_CLIENT_ID`, `DEPLOY_WEBHOOK_URL`.
- **TLS caveat:** `PORTAINER_TLS_INSECURE=true` currently trusts Portainer's self-signed cert — remove once Portainer sits behind Traefik with a CA-signed cert.

> **Manual redeploy & rollback:** [`docs/infrastructure/MSP_PORTAL_STACK.md`](docs/infrastructure/MSP_PORTAL_STACK.md) §7 (`scripts/portainer-stack-update.js <version>` or the Portainer UI → Stacks → `msp_portal` → Pull & redeploy).

---

## 💻 Local Setup & Development

### Database Configuration & Setup

1. **Environment Variables:**
   Copy `server/.env.example` to `server/.env` and configure PostgreSQL credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

2. **Database Migrations:**

   ```bash
   # Run all pending migrations:
   npm -w server run db:migrate
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

- **Skeleton Primitive:** [skeleton.tsx](client/src/components/ui/skeleton.tsx)
- **DataTable Skeleton:** [data-table.tsx](client/src/components/ui/data-table.tsx) displays skeleton rows matching table structure when `loading` is active.
- **Ticket Detail Skeleton:** [TicketDetailPage.tsx](client/src/pages/TicketDetailPage.tsx) renders layout grid skeletons during asynchronous data fetches.

---

## 📧 Email Design System & Transactional Templates

The platform features a **Token-Driven Homogeneous Email Design System** shared conceptually between the frontend live preview and backend dispatch engine:

- **Frontend Template Suite:** [`client/src/email-templates/`](client/src/email-templates/)
  - `tokens.ts`: Unified design tokens for brand palette (`#0C4A6E`, `#38BDF8`, `#2563EB`), typography, spacing, and shadows.
  - `components.tsx`: Standardized sub-components (`Greeting`, `InfoCard`, `DetailRow`, `Badge`, `Callout`, `Disclaimer`, `HighlightCode`, `FallbackLink`).
  - `EmailWrapper.tsx`: Responsive layout shell with header gradient, 3px colored accent bar, and bilingual footer.
  - `PasswordResetTemplate.tsx`, `OTPTemplate.tsx`, `TicketCreatedTemplate.tsx`, `InvoiceReminderTemplate.tsx`.
- **Live Interactive Gallery:** Accessible in the client portal under **Notifications & Preferences** (`/notifications`), providing live multi-template inspection with English and Spanish language switching.
- **Backend Email Dispatcher:** [`server/src/shared/utils/emailService.ts`](server/src/shared/utils/emailService.ts) renders and sends identical HTML for all system notifications via Nodemailer SMTP.

---

## ☁️ Cloud Storage & Infrastructure Integration

The portal integrates with **Nextcloud** running on **TrueNAS SCALE** (`cloud-storage-srv-1`) to provide automatic cloud backup storage (25 GB per device slot) to clients.

- **WireGuard Site-to-Client Tunnel:** Secures internal communication between the helpdesk VPS (`10.13.13.1`) and customer TrueNAS (`10.13.13.3:30027`), bypassing dynamic WAN IPs and firewall NAT barriers without open incoming router ports.
- **Traefik Public Ingress:** Exposes Nextcloud sync at `https://atlas.velmartech.com.do` via Traefik reverse proxy through the tunnel; the portal itself runs at `https://helpdesk.velmartech.com.do`.
- **Backend Provisioning Service:** [`server/src/modules/system/services/NextcloudService.ts`](server/src/modules/system/services/NextcloudService.ts) automatically creates and manages client storage accounts via OCS REST and WebDAV APIs.
- **Infrastructure Docs & Runbooks:** Full architectural guide, IP topology, and diagnostic scripts are available in [`docs/infrastructure/WIREGUARD_NEXTCLOUD_INTEGRATION.md`](docs/infrastructure/WIREGUARD_NEXTCLOUD_INTEGRATION.md) and [`scripts/infra/wireguard/`](scripts/infra/wireguard/). The production `msp_portal` stack (12 services, Traefik routing, Zabbix subpath fix, deploy/rollback) is documented in [`docs/infrastructure/MSP_PORTAL_STACK.md`](docs/infrastructure/MSP_PORTAL_STACK.md).

---

## 🛡️ SOTA Authorization Engine & Live Demonstration

The platform includes a State-of-the-Art (SOTA) Authorization subsystem (`server/src/shared/authz/`) combining **RBAC**, **Google Zanzibar ReBAC**, **Policy-as-Code ABAC**, **AI/RAG Vector ACLs**, and **Continuous Adaptive Trust**.

To run the interactive live demonstration in your terminal:
```bash
npm -w server exec tsx src/shared/scripts/demoAuthz.ts
```

To run all authorization unit tests:
```bash
npm -w server exec vitest run src/shared/authz/ src/shared/middleware/authzMiddleware.test.ts
```

---

## ⏱️ Distributed Background Tasks, Schedulers & Concurrency Controls

The platform implements a distributed background job orchestration pattern designed for horizontally scalable Node.js clusters (e.g. Docker, PM2 cluster mode, Kubernetes):

- **Distributed Mutex Locking ([`DistributedLock.ts`](server/src/shared/utils/cache/DistributedLock.ts)):**
  - Uses Redis `SET ... NX PX` with UUID verification and atomic Lua scripts (`EVAL`) for lock release.
  - Automatically falls back to local in-memory mutexes if Redis is unreachable, ensuring single-node concurrency is always protected.
- **Subscription & Invoicing Sweep Daemon ([`SubscriptionScheduler.ts`](server/src/modules/subscriptions/services/SubscriptionScheduler.ts)):**
  - Guarded by distributed lock key `cron:subscriptions:sweep` (TTL: 60s).
  - Sweeps expiring subscriptions (**BL-402**), calculates hardware multipliers, dispatches advance 7-day expiration warnings, generates automated renewal invoices, and enforces **Section 9.3 Non-Payment Suspension Scale** without duplicate charges or duplicate notification emails across cluster replicas.
- **Ticket Tier Escalation Daemon ([`EscalationScheduler.ts`](server/src/modules/tickets/services/EscalationScheduler.ts)):**
  - Guarded by distributed lock key `cron:tickets:escalation_sweep` (TTL: 50s).
  - Sweeps open unworked tickets and escalates them to Tier 2 based on priority thresholds (**BL-104**), preventing race conditions or conflicting technician assignments across concurrent workers.
- **Graceful Lifecycle & Signal Handling ([`server/src/index.ts`](server/src/index.ts)):**
  - Intercepts `SIGTERM` and `SIGINT` to cleanly halt schedulers, clear active timers, close WebSocket client connections, and flush server resources before process exit.

---

## 📖 API Documentation

Interactive Swagger API documentation is available when the server is running:

- **Direct Backend URL:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **API v1 Endpoint URL:** [http://localhost:3001/api/v1/api-docs](http://localhost:3001/api/v1/api-docs)
- **Frontend Proxy URL (Dev):** [http://localhost:5173/api-docs](http://localhost:5173/api-docs)

---

## 🛠️ Git Workflow, Commit Conventions & Pre-Commit Hooks

The repository strictly enforces **[Conventional Commits](https://www.conventionalcommits.org/)** specifications locally via **Husky** and **Commitlint** to ensure clean git histories and automated semantic release tagging (`commit-and-tag-version`).

### Commit Format
```text
<type>(<scope>): <short description in imperative mood>

[optional body with detailed changelog / context]

[optional footer(s): Closes #123, BREAKING CHANGE: ...]
```

### Allowed Types
- `feat`: New feature or capability
- `fix`: Bug fix
- `docs`: Documentation updates
- `style`: Formatting, missing semi colons, UI alignment (no code logic change)
- `refactor`: Refactoring code without changing public behavior or fixing bugs
- `perf`: Performance optimizations
- `test`: Adding or correcting tests
- `build`: Build system or dependency updates
- `ci`: CI configuration and scripts (`.github/workflows/`)
- `chore`: Maintenance tasks, releases (`chore(release): 1.5.5`)
- `revert`: Reverting a previous commit

### Common Domain Scopes
`rmm`, `client`, `server`, `equipment`, `system`, `tickets`, `billing`, `subscriptions`, `crm`, `notifications`, `auth`, `ui`, `i18n`, `web`, `infra`, `shared`, `deps`

### Pre-Commit / Commit-Msg Validation
Hooks are automatically installed via `npm run prepare` (configured in root `package.json`). Whenever you run `git commit`, Husky invokes Commitlint to validate your commit message before it is accepted.


