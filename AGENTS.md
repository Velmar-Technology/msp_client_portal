---
name: Repo-Orchestrator
version: 2.3.0
permissions:
  terminal: allowed
  file_write: allowed
  internet_access: restricted
---

# AGENTS.md - Repository Rules, Clean Architecture & Master Context
Canonical instructions for AI agents operating on `msp_client_portal`. Follow strictly on every turn.
Read `CONSTRAINTS.md` before writing code. Full architectural specs: `docs/architecture/master-agents-reference.md`.

## 1. Project Context & Stack
* **Architecture:** Modular Monolith in npm workspace monorepo (`client`, `server`, `packages/*`).
* **Runtime & Language:** Node.js v22+ (Strict TypeScript), ESM.
* **Backend:** Express 5.x, Drizzle ORM 0.45.x, PostgreSQL 16+, Redis (`ioredis`), Winston Logger, Vitest.
* **Packages:** `@shared/errors` (Standardized domain errors), `@shared/contracts` (API contracts, Zod schemas & types), MCP server (`packages/mcp-server`).

## 2. Core Workflows & Tool Execution
Use ONLY exact workspace commands:
* **Install:** `npm install`
* **Dev:** `npm -w server run dev` / `npm -w client run dev`
* **Build:** `npm -w server run build` / `npm -w client run build` / `npm run build:packages`
* **Test:** `npm -w server run test` (Backend) / `npm -w client run test:run` (Frontend)
* **DB:** `npm -w server run db:migrate`
* **Lint:** `npm -w server run lint` / `npm -w client run lint`
* **Knowledge Graph:** `npm run graph:build` / `npm run graph:reconstruct` / `npm run graph:query -- "<question>"`

## 3. Clean Architecture & Layer Boundary Rules
Dependencies point strictly **INWARD**: Frameworks/Drivers $\rightarrow$ Interface Adapters $\rightarrow$ Use Cases $\rightarrow$ Entities.
1. **Entities (`server/src/shared/types/`, `server/src/shared/db/schema/`):** Pure domain types, ports, Drizzle schemas. Zero external/framework dependencies.
2. **Services (`server/src/modules/<domain>/services/`):** Constructor-injected dependencies (e.g. `constructor(private userRepo: UserRepository = userRepository)`). No direct `db` pool or Express `req`/`res`. Throw typed errors from `@shared/errors`. Never stub OTP/billing emails.
3. **Repositories (`server/src/modules/<domain>/repositories/`):** Encapsulate Drizzle queries. **Pragmatic Rule:** Standard CRUD/relations query Drizzle directly (`db.query.*`). Dedicated Repositories reserved for non-trivial SQL (complex CTEs, window functions, raw aggregations).
4. **Controllers (`server/src/modules/<domain>/controllers/`):** Translate HTTP to service calls. Express 5 native async error propagation (no `try/catch (err) { next(err); }` boilerplate; never return inline error JSON `res.status(400).json(...)`). Never import repositories or `db` pool directly.
5. **API Gateway (`server/src/shared/middleware/gateway*.ts`):** Injects `X-User-Id` / `X-Tenant-Id` headers; enforces multi-tenant sliding-window rate limit (`1000 req/15m`).
6. **Module Gateway (`server/src/modules/<domain>/index.ts`):** Single public API per domain. Cross-module imports of internal repositories, controllers, or ORM schemas are **FORBIDDEN**.
7. **Redis Caching (`server/src/shared/utils/cache/`):** Consumed via `CachePort` abstraction (ioredis + LRU fallback, generation invalidation, `DistributedLock`).
8. **Contract-First API (`@shared/contracts`):** Request bodies, params, and responses defined in `@shared/contracts` with Zod (@see ADR-001). Express routes validate directly.

## 4. Master Business Logic Specification
* **BL-101 (1h SLA Cancel):** `WARRANTY` / `SERVICE_OUTAGE` tickets cancelable only within 60m of creation (`SLA_WINDOW_MS = 3600000`). Throws `SlaViolationError`.
* **BL-102 (Round-Robin):** Category technician rotation: Active Specialists $\rightarrow$ General Active Pool.
* **BL-103 (Alerts & Remediation):** 15m dedup window. Scripts $\le 300\text{s}$ auto-close as `RESOLVED_AUTOMATED`. Flapping ($\ge 3$ triggers/24h) tags `[FLAPPING_ALERT]` and routes to Tier 2.
* **BL-104 (Tier Escalation):** Unworked OPEN tickets escalate: CRITICAL (10m), HIGH (20m), MED (45m), LOW (120m). Capacity-weighted: P1=4, P2=2, P3=1, P4=0.5.
* **BL-201 (Feature Quota):** Enforce monthly ticket limits (e.g. 5/device/mo). Throws `TicketLimitExceededError`.
* **BL-202 (License True-Up):** Nightly reconciliation of cloud seats/RMM agents against baseline contracts.
* **BL-204 (Feature Gating):** Enforce `FEATURE_CODES` via `requireSubscriptionFeature` and client `FeatureRouteGuard`/`useEntitlements`. Expand bundles (`expandFeatureBundles`); non-entitled receive 403 or `<FeatureLockedPreview>`.
* **BL-205 (Device Passwords):** Workstation credentials bound to physical slots (`device_<slotId>@tenant.local`) with `hidePasswords: true`. Emergency lock/revocation terminates Bitwarden sessions.
* **BL-301 (RBAC & Transitions):** Enforce `STATUS_TRANSITIONS` matrix. Clients: tenant-isolated, cancel only. Techs: assigned tickets. Admins: global.
* **BL-302 (Hybrid AuthZ & Dynamic RBAC):** Unified PDP: Dynamic DB RBAC (`roles`, `permissions`, `user_roles`) via `PermissionService` & `requirePermission` (@see ADR-014), Zanzibar ReBAC, Policy-as-Code ABAC, JIT Ephemeral Access (`EphemeralAccessService`), SPIFFE Identity, Role Mining Pruning, Step-Up MFA.
* **BL-401 (Reactivation):** PayPal capture / admin `markAsPaid` transitions linked `EXPIRED` subscription to `ACTIVE`.
* **BL-402 (Renewal Scheduler):** Cron calculates hardware multiplier ($M_{\text{equip}}$), creates invoices, dispatches billing emails.
* **BL-501 (CRM Pipeline & Segmentation):** `NEW` $\rightarrow$ `QUALIFIED` $\rightarrow$ `PROPOSAL` $\rightarrow$ `NEGOTIATION` $\rightarrow$ `WON`/`LOST`. Explicit lead `client_type` auto-defaults from plan and propagates to user on `WON` conversion (@see ADR-015).
* **BL-601 (Health Score):** $H = 0.40 S_{\text{ticket}} + 0.30 S_{\text{hardware}} + 0.30 S_{\text{security}}$. Score $< 70\%$ flags QBR review.
* **BL-701 (NCF & 18% ITBIS):** USD/DOP rates apply 18% ITBIS. Auto-generate Series B01 sequential NCF when valid RNC/Cédula provided.
* **BL-702 (4-Tier Non-Payment):** Overdue invoice: Day 1 (Notice), Day 5 (`READ_ONLY`), Day 15 (`SUSPENDED`), Day 30 (`PURGED` storage & device credentials). Settling payment restores `ACTIVE`.
* **BL-703 (Complimentary Plan Invariant):** Zero-Invoice Guarantee: Free/promo/trial plans must NEVER create rows in `invoices` table. Invoices strictly for actual customer transactions.
* **BL-801 (Commissions & OpEx):** Per-ticket bounties ($8 base $\times$ priority [LOW 1.0x, MED 1.25x, HIGH 1.75x, CRITICAL 2.5x] + $4 SLA bonus). Auto-posted as Pre-Split OpEx in `expenses`. 48h holdback with void on reopening. `RESOLVED_AUTOMATED` = $0.
* **BL-802 (70/30 Profit Split):** Net = Gross Revenue - Deductible OpEx. Split: HQ absorbs 70% costs / takes 70% net pool; Lead Engineer/Admin takes 30% net.

## 5. Standardized Data Journeys (CQS)
* **Ticket Creation (`POST /api/v1/tickets`):** Quota check $\rightarrow$ insert `OPEN` $\rightarrow$ audit log $\rightarrow$ round-robin assign $\rightarrow$ email/in-app alert. Return 201.
* **Ticket Cancellation (`PATCH /api/v1/tickets/:id/status`):** Tenant/owner match + status check + 1h SLA rule (`BL-101`) $\rightarrow$ update `CANCELLED` $\rightarrow$ notify tech. Return 200.
* **Invoice Payment (`POST /api/v1/invoices/:id/capture-paypal` | `mark-paid`):** Capture PayPal/wire $\rightarrow$ mark `PAID` $\rightarrow$ set subscription `ACTIVE` $\rightarrow$ notify. Return 200.
* **Vault Provision / Revocation:** Tenant match $\rightarrow$ provision/lock Bitwarden device session $\rightarrow$ update `vaultwarden_status`. Return 200.

## 6. Frontend Standards (React 19 / Vite / Tailwind v4)
1. **Layering:** L1 Primitives (`components/ui`) $\leftarrow$ L2 Shared Blocks (`components/shared`, `layout`) $\leftarrow$ L3 Features (`features/<domain>`) $\leftarrow$ L4 Routes (`routes`, `pages`).
2. **Feature Colocation (@see ADR-002):** Features in `client/src/features/<domain>/` with colocated `api/`, `components/`, `hooks/`, `pages/`, `index.ts`. No duplicate backend types; import from `@shared/contracts`. Cross-feature imports strictly via target feature `index.ts`.
3. **`shadcn/ui` Primitives:** Mandatory for all UI elements. Raw `<button>`, `<input>`, `<select>` are forbidden.
4. **Validation:** Zod schemas (`@shared/contracts` + `@hookform/resolvers/zod`). Password complexity enforced.
5. **State:** TanStack Query for server state (fetching, caching, invalidation). Zustand strictly for ephemeral UI state (auth session, tenant, theme, sidebar, modal).
6. **i18n:** Zero hardcoded UI text; all strings via `t("namespace.key")` in `en_US.json` and `es_DO.json`.
7. **URL State Sync:** Sub-views, filters, and modals sync via `useUrlState`.
8. **Heights:** Standard `h-7` (28px) for buttons, inputs, select triggers (`xs: h-5`, `sm: h-6`, `lg: h-8`).
9. **Performance:** `lazyWithRetry`, localized domain skeletons in `<RouteSuspenseWrapper>`, `useDeferredLoading`, route preloading (`preloadRoute`, `preloadOnIdle`).

## 7. Domain Errors & Handling Matrix
* **Classes (`@shared/errors`):** `ValidationError` (400), `NotFoundError` (404), `UnauthorizedError` (401), `ForbiddenError` (403), `ConflictError` (409), `SlaViolationError` (403), `TicketLimitExceededError` (403), `InvalidTransitionError` (400), `RateLimitError` (429), `ExternalServiceError` (502), `InternalServerError` (500).
* **Rules:** Throw specific typed domain errors (`throw new NotFoundError(...)`). Never throw raw `Error()`. Express 5 native async error propagation (no try/catch `next(err)` boilerplate, no inline `res.status(400).json(...)`).

## 8. Clean Code & TDD
* Boy Scout Rule, 3 Rules of TDD, SOLID, CQS, functions $\le 20$ lines.
* **Mandatory JSDoc/TSDoc:** All exported services, repository queries, controllers, hooks, and utilities MUST include `@param`, `@returns`, `@throws {AppError}`, and `@see BL-xxx`.

## 9. Operational Guardrails
* **Scope Discipline:** Modify only files in requested domain. Never run global refactors unprompted.
* **Utility Reuse:** Check `@shared/utils/` and UI primitives before creating helpers.
* **Protected Paths:** `.env*`, `.github/workflows/`, `server/src/shared/db/migrations/`, `.husky/`.
* **MCP Guardrails:** Use tools matching domain; never synthesize roundabout workarounds for missing tools.
* **Commits & PRs:** Conventional Commits (`<type>(<scope>): <summary>`). Adhere to `.github/pull_request_template.md`.

## 10. Definition of Done (DoD)
1. **Clean Compilation:** Zero TypeScript errors (`npm -w server run build` & `npm -w client run build`).
2. **Boundary Compliance:** Strict Dependency Inversion & gateway encapsulation.
3. **Green Tests:** Local Vitest test suites pass with zero regressions (`npm -w server run test` & `npm -w client run test:run`).
4. **Test Coverage:** New domain logic includes unit tests (`*.spec.ts` / `*.test.ts`).
5. **JSDoc:** Exported symbols annotated with `@param`, `@returns`, and `@throws`.
6. **Git Discipline:** Conventional Commit format.
7. **Verification Proof:** Walkthroughs include numbered verification steps and test/terminal evidence.
