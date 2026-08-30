---
name: Repo-Orchestrator
version: 2.2.0
permissions:
  terminal: allowed
  file_write: allowed
  internet_access: restricted
---

# AGENTS.md - Repository Rules, Clean Architecture & Master Context

Canonical instructions for AI agents operating on `msp_client_portal`. Follow strictly on every turn.

## 1. Project Context & Stack
* **Architecture:** Modular Monolith in npm workspace monorepo (`client`, `server`, `packages/*`).
* **Runtime & Language:** Node.js v22+ (Strict TypeScript), ESM.
* **Backend:** Express 5.x, Drizzle ORM 0.45.x, PostgreSQL 16+, Redis (`ioredis`), Winston Logger, Vitest.
* **Frontend:** React 19.x, Vite 8.x, Tailwind CSS v4, shadcn/ui (`radix-ui`), Zustand, React Hook Form + Zod, TanStack Table, i18next.
* **Packages:** `@shared/errors` (Standardized domain error primitives), MCP server (`packages/mcp-server`).

## 2. Core Workflows & Tool Execution
Use ONLY the exact workspace commands below:
* **Install Dependencies:** `npm install`
* **Dev Backend / Frontend:** `npm -w server run dev` / `npm -w client run dev`
* **Typecheck / Build:** `npm -w server run build` / `npm -w client run build`
* **Build Shared Packages:** `npm run build:packages`
* **Run Tests:** `npm -w server run test` (Backend) / `npm -w client run test:run` (Frontend)
* **Database Migrations:** `npm -w server run db:migrate`
* **Linting:** `npm -w server run lint` / `npm -w client run lint`

## 3. Clean Architecture & Layer Boundary Rules

Dependencies point strictly **INWARD**: `Frameworks/Drivers` $\rightarrow$ `Interface Adapters` $\rightarrow$ `Use Cases` $\rightarrow$ `Entities`.

```
[ Frameworks & Drivers (DB Pool, Express, Cache, UI) ]
                     │
                     ▼
[ Interface Adapters (Controllers, Repositories, Client Services) ]
                     │
                     ▼
[ Use Cases (Domain Services: TicketCreationService, InvoicePaymentService, etc.) ]
                     │
                     ▼
[ Entities (Domain Types, Drizzle Schemas, Port Abstractions) ]
```

### Layer Constraints:
1. **Entities Layer (`server/src/shared/types/`, `server/src/shared/db/schema/`)**: Pure types and ports. Zero external/framework dependencies.
2. **Service / Use Case Layer (`server/src/modules/<domain>/services/`)**:
   - Constructor-injected dependencies (e.g. `constructor(private userRepo: UserRepository = userRepository)`).
   - No direct `db` pool or Express `req`/`res` imports.
   - Throw typed domain errors from `@shared/errors` (e.g., `throw new NotFoundError(...)`). Never use raw `throw new Error()`.
   - **Notification Integrity:** Never stub or omit emails/notifications in auth/billing/ticket flows (`sendOTPEmail`, `sendInvoiceDueEmail`, etc.).
3. **Repository Layer (`server/src/modules/<domain>/repositories/`)**: Encapsulates all Drizzle ORM queries. Never import controllers, services, or Express objects.
4. **Controller Layer (`server/src/modules/<domain>/controllers/`)**: Translates HTTP requests to service calls. Express 5 native async error propagation (no `try/catch (err) { next(err); }` boilerplate; never return inline error JSON `res.status(400).json(...)`). Never import repositories or `db` pool directly.
5. **API Gateway (`server/src/shared/middleware/gateway*.ts`)**: Injects `X-User-Id` / `X-Tenant-Id` headers and enforces sliding-window multi-tenant rate limits (`1000 req/15m`).
6. **Module Gateway (`server/src/modules/<domain>/index.ts`)**: Every domain module (`auth`, `tickets`, `billing`, `subscriptions`, `rmm`, `equipment`, `crm`, `notifications`, `system`) exposes its public API strictly via `index.ts`. Cross-module imports of internal repositories, controllers, or ORM schemas are **FORBIDDEN**.
7. **Redis Caching & Concurrency (`server/src/shared/utils/cache/`)**: Consumed via `CachePort` abstraction. Implements Redis (`ioredis`) with in-memory LRU fallback, generation-based cache invalidation, and `DistributedLock` for race-condition mitigation in critical mutations.

---

## 4. Master Business Logic Specification

| Code | Rule Name | Core Logic & Constraints |
| :--- | :--- | :--- |
| **BL-101** | 1-Hour SLA Cancellation | `WARRANTY` / `SERVICE_OUTAGE` tickets can only be cancelled within 60m ($\text{SLA\_WINDOW\_MS} = 3.6\times 10^6\text{ms}$) of creation via `TicketAccessPolicy.enforceSLARule`. Throws `SlaViolationError`. |
| **BL-102** | Round-Robin Dispatch | Category-based technician rotation with fallback: Active Specialists $\rightarrow$ General Active Pool. |
| **BL-103** | Alert Noise & Auto-Remediation | 15m deduplication window for same asset. Scripts resolving in $\le 300\text{s}$ auto-close as `RESOLVED_AUTOMATED`. **Flapping:** $\ge 3$ triggers in 24h tag `[FLAPPING_ALERT]` and route to Tier 2. |
| **BL-104** | Tier Escalation | Unworked OPEN tickets escalate to Tier 2: CRITICAL (10m), HIGH (20m), MEDIUM (45m), LOW (120m). Assigned by capacity-weighted load ($\text{P1}=4, \text{P2}=2, \text{P3}=1, \text{P4}=0.5$). |
| **BL-201** | Feature Quota | Enforces plan ticket limits (e.g. 5 tickets/device/mo). Blocks creation with `TicketLimitExceededError`. |
| **BL-202** | License True-Up | Nightly reconciliation of cloud seats/RMM agents against baseline contracts for next billing cycle. |
| **BL-301** | RBAC & State Machine | Transitions must satisfy `STATUS_TRANSITIONS` matrix. Clients: tenant isolation, cancel only. Techs: assigned tickets. Admins: global. |
| **BL-302** | SOTA Hybrid Authorization | Unified PDP (`server/src/shared/authz/`) orchestrating RBAC (roles), Zanzibar ReBAC (`<subject>#<relation>@<object>`), Policy-as-Code ABAC (SLA/Non-payment), Vector AI ACL pre-filtering, and Continuous Adaptive Trust. |
| **BL-401** | Subscription Reactivation | PayPal capture or admin `markAsPaid` transitions linked `EXPIRED` client subscriptions to `ACTIVE` and broadcasts alerts. |
| **BL-402** | Renewal Scheduler | Cron evaluates expiry, calculates hardware multiplier ($M_{\text{equip}}$), creates invoices, and dispatches billing emails. |
| **BL-501** | CRM Lead Pipeline | Deals progress: `NEW` $\rightarrow$ `QUALIFIED` $\rightarrow$ `PROPOSAL` $\rightarrow$ `NEGOTIATION` $\rightarrow$ `WON`/`LOST`. `WON` auto-provisions client tenant. |
| **BL-601** | Account Health | $H = 0.40 S_{\text{ticket}} + 0.30 S_{\text{hardware}} + 0.30 S_{\text{security}}$. Score $< 70\%$ flags QBR review task. |
| **BL-701** | NCF & 18% ITBIS Tax | Rates in USD or DOP apply 18% ITBIS tax. Automatically generates Series B01 sequential NCF vouchers when tenant or client supplies a valid DGII Modulo 11/10 RNC or Cédula. |
| **BL-702** | 4-Tier Non-Payment Scale | Evaluates oldest overdue invoice: Day 1 (Collection Notice), Day 5 (`READ_ONLY` mode, write mutations blocked), Day 15 (`SUSPENDED` mode, access halted), Day 30 (`PURGED` mode, Nextcloud storage and device credentials permanently deleted for storage liberation with zero liability). Settling payments restores account to `ACTIVE`. |

---

## 5. Standardized Data Journeys (CQS)

1. **Ticket Creation (`POST /api/v1/tickets`)**:
   - *Query:* `ticketQuotaService.enforceTicketLimit` validates monthly subscription quota.
   - *Commands:* `ticketRepository.create` (inserts `OPEN`), `ticketEventRepository.create` (logs audit), `assignmentService.getNextTechnician` (updates `round_robin_state`), `ticketRepository.assignTechnician`.
   - *Side Effects:* Dispatches creation email & in-app notification. Returns HTTP 201.
2. **Ticket Cancellation (`PATCH /api/v1/tickets/:id/status`)**:
   - *Validation:* Checks tenant/ownership match + transition validity + 1-hour SLA rule (`BL-101`).
   - *Commands:* `ticketRepository.updateStatus(id, 'CANCELLED')`, `ticketEventRepository.create`.
   - *Side Effects:* Notifies assigned technician. Returns HTTP 200.
3. **Invoice Payment (`POST /api/v1/invoices/:id/capture-paypal` or `mark-paid`)**:
   - *Commands:* Capture PayPal order / verify wire $\rightarrow$ `invoiceRepository.updateStatus(id, 'PAID')` $\rightarrow$ `subscriptionRepository.updateStatus(subId, 'ACTIVE')` for expired client subscriptions $\rightarrow$ creates in-app notifications for client & admins. Returns HTTP 200.

---

## 6. Frontend Architectural Standards & State Management (React 19 / Vite / Tailwind v4)

1. **4-Level Component Hierarchy**:
   $$\text{L1: Primitives (/components/ui)} \leftarrow \text{L2: Shared Blocks (/components/shared, layout)} \leftarrow \text{L3: Feature Components (/components/[domain])} \leftarrow \text{L4: Pages (/pages, /routes)}$$
   - Lower layers NEVER import higher layers. Feature modules never cross-import directly.
   - **`shadcn/ui` (`radix-ui`) Primitives**: ALL UI elements (Button, Dialog, Input, Select, Badge, Card, Table) MUST use `client/src/components/ui/`. Never write raw `<button>`, `<input>`, or `<select>`.
2. **`Zod` Schema & DTO Validation**:
   - **Dual-Boundary Validation**: Backend DTO schemas in `@shared/dtos/` and Frontend form schemas in `client/src/components/` paired with `@hookform/resolvers/zod`.
   - All input mutations MUST execute `schema.safeParse(...)` before processing. Password fields require complexity validation (min 8 chars, uppercase, lowercase, number, match confirmation).
3. **`Zustand` Client State Management (`client/src/store/`)**:
   - Confined strictly to global UI/session state (auth session, active tenant, theme, sidebar state).
   - Use atomic selector patterns (`useStore(state => state.property)`) to prevent unnecessary re-renders. Never store ephemeral server cache data in Zustand.
4. **i18n Localization**: Zero hardcoded UI text. All strings use `useTranslation()` (`t("namespace.key")`) and must exist in `en_US.json` and `es_DO.json`. No inspecting `t()` return values to guess language.
5. **URL State Synchronization**: Page sub-views (`?tab=...`), table filters (`?status=...`, `?search=...`), and modals (`?openModal=...`) must sync via `useUrlState`.
6. **Control Heights**: Uniform compact standard `h-7` (28px) for buttons, inputs, and select triggers (`xs: h-5`, `sm: h-6`, `default: h-7`, `lg: h-8`). No ad-hoc heights.
7. **Performance & Code Splitting**:
   - Top-level routes use `lazyWithRetry` from `@/lib/lazyWithRetry`.
   - Suspense fallback MUST use localized domain skeletons (`DashboardSkeleton`, `TablePageSkeleton`, `DetailSkeleton`, `ContentPageSkeleton`) inside `<RouteSuspenseWrapper>`. No generic fullscreen spinners.
   - Skeleton flicker prevention: Use `useDeferredLoading(loading, SKELETON_DISPLAY_DELAY_MS)`.
   - Preloading: Hover/focus triggers `preloadRoute(to)`; idle time triggers `preloadOnIdle`.

---

## 7. Domain Error Hierarchy & Handling Matrix

| Error Class | HTTP Code | Code String | Base | Usage |
| :--- | :---: | :--- | :--- | :--- |
| **`ValidationError`** | 400 | `VALIDATION_ERROR` | `AppError` | Schema / input constraint failures |
| **`NotFoundError`** | 404 | `NOT_FOUND_ERROR` | `AppError` | Missing entities (tickets, users, invoices) |
| **`UnauthorizedError`** | 401 | `UNAUTHORIZED_ERROR` | `AppError` | Missing / invalid JWT or session |
| **`ForbiddenError`** | 403 | `FORBIDDEN_ERROR` | `AppError` | RBAC violations, cross-tenant access |
| **`ConflictError`** | 409 | `CONFLICT_ERROR` | `AppError` | Unique key or constraint collisions |
| **`SlaViolationError`** | 403 | `SLA_VIOLATION` | `ForbiddenError` | Late ticket cancellation attempt |
| **`TicketLimitExceededError`** | 403 | `TICKET_LIMIT_EXCEEDED` | `ForbiddenError` | Quota exceeded for plan/device |
| **`InvalidTransitionError`** | 400 | `INVALID_STATUS_TRANSITION` | `ValidationError` | Disallowed state machine change |
| **`RateLimitError`** | 429 | `RATE_LIMIT_EXCEEDED` | `AppError` | Rate limiter threshold exceeded |
| **`ExternalServiceError`** | 502 | `EXTERNAL_SERVICE_ERROR` | `AppError` | Third-party failure (PayPal, Nextcloud) |
| **`InternalServerError`** | 500 | `INTERNAL_SERVER_ERROR` | `AppError` | Non-operational unexpected system error |

---

## 8. Uncle Bob's Clean Code & Engineering Principles

* **Boy Scout Rule:** Leave code cleaner than you found it.
* **Three Rules of TDD:** (1) Write production code only to pass a failing test. (2) Write only enough unit test to fail. (3) Write only enough code to pass the failing test.
* **SOLID Principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
* **Functions:** Small (4–20 lines), do one thing, $\le 2$ parameters (use object for more), Command-Query Separation (CQS).
* **Naming & Comments:** Intention-revealing names. Comments explain *why*, not *what* or *how*.
* **JSDoc / TSDoc Guardrails:**
  - **Mandatory Coverage:** All exported domain services, repository methods, controllers, custom hooks, public API routes, and shared utilities MUST include structured JSDoc/TSDoc blocks (`/** ... */`).
  - **Standard Tags:** Must explicitly specify `@param` descriptions, `@returns` descriptions, and `@throws {AppError}` for all propagated domain error types (e.g., `@throws {NotFoundError}`, `@throws {SlaViolationError}`).
  - **Business Logic Cross-Referencing:** Complex operations implementing master rules must reference their spec code (e.g., `@see BL-101`, `@see BL-201`).
  - **No Redundant Clutter:** Do not duplicate obvious TypeScript types in comments; focus on intent, operational invariants, side effects, and pre/post-conditions.

---

## 9. Operational Guardrails & Interactive Protocol

* **Interactive Clarification:** For UI/UX choices, scope tradeoffs, or ambiguous specs, ask upfront structured questions via `ask_question` before executing plans.
* **Scope Discipline:** Modify *only* files in the requested domain. Never run global refactors without instruction.
* **Utility Reuse:** Check `@shared/utils/`, `client/src/lib/utils.ts`, and `client/src/components/ui/` before creating new helper functions.
* **Protected Paths (NEVER delete/rewrite unprompted):**
  - `.env`, `.env.*`
  - `.github/workflows/`
  - `server/src/shared/db/migrations/` (unless generating new migration)
  - `.husky/`
* **Conventional Commits:** `<type>(<scope>): <imperative summary>` (`feat`, `fix`, `refactor`, `test`, `chore` with scopes `tickets`, `billing`, `auth`, `client`, `server`, etc.).

---

## 10. Definition of Done (DoD)

A task or agent turn is complete ONLY when:
1. **Clean Compilation:** Zero TypeScript errors (`npm -w server run build` / `npm -w client run build`).
2. **Boundary Compliance:** Strict Dependency Inversion (controllers $\rightarrow$ services $\rightarrow$ repositories). No forbidden cross-module imports.
3. **Green Tests:** Local Vitest test suites pass with zero regressions (`npm -w server run test` / `npm -w client run test:run`).
4. **Test Coverage:** New domain services, policies, or business logic include co-located unit tests (`*.spec.ts` / `*.test.ts`).
5. **JSDoc / Documentation:** All exported services, repository queries, hooks, and utilities include standard JSDoc/TSDoc annotations with `@param`, `@returns`, and `@throws`.
6. **Git Discipline:** Commit conforms to Conventional Commits.

