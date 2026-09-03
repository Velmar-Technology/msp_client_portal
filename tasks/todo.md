# Implementation Tasks: SOTA Infrastructure Overhaul & Contract Conformance Engine

## Milestone 1: Security & Blast Radius (P0)

### Task 1: Purge Hardcoded Secrets & Split Compose Basic-Auth Hashes
**Description:** Remove hardcoded admin credentials and fallback passwords from production and development compose files. Generate distinct, dedicated bcrypt hashes for Zabbix, Dozzle, and Prometheus, requiring all sensitive secrets to be injected from the environment.
**Acceptance criteria:**
- [x] `docker-compose.prod.yml` removes inline `GF_SECURITY_ADMIN_PASSWORD` and personal admin email.
- [x] Distinct environment-driven basic-auth hashes replace the shared hash across `zabbix-auth`, `logs-auth`, and `prom-auth`.
- [x] Root `docker-compose.yml` replaces plaintext JWT and PayPal keys with `.env` variable references.
- [x] `docs/infrastructure/MSP_PORTAL_STACK.md` updated to reflect individual per-service secret requirements.
**Verification:**
- [x] `git diff` shows zero plaintext credentials or fallback passwords.
- [x] Docker compose config validation: `docker compose -f docker-compose.prod.yml config` validates cleanly.
**Dependencies:** None  
**Files touched:**
- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docs/infrastructure/MSP_PORTAL_STACK.md`
**Estimated scope:** Small (3 files)

---

### Task 2: Implement Redis Sliding-Window & Auth Brute-Force Rate Limiter
**Description:** Replace the in-memory `Map` limiter in `gatewayRateLimiterMiddleware.ts` with a Redis-backed atomic sliding-window algorithm using the existing `CachePort` / `redisClient`. Add dedicated per-IP and per-account brute-force rate limiting to `/auth` routes with exponential backoff, retaining an automatic in-memory LRU fallback for resilience.
**Acceptance criteria:**
- [x] Global gateway rate limiter uses Redis sorted sets / pipeline for atomic sliding-window increment and expiry (`1000 req/15m`).
- [x] `/auth` routes (`login`, `otp/send`, `otp/verify`, `forgot-password`) enforce strict brute-force limits (e.g., 5 attempts / 5m per IP and account).
- [x] If Redis is unreachable, both limiters fall back gracefully to the in-memory LRU cache without dropping requests.
- [x] Response headers include standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After`.
- [x] Unit tests pass in `server/src/shared/middleware/gatewayMiddleware.test.ts` and auth rate limiter test.
**Verification:**
- [x] `npx vitest run src/shared/middleware/gatewayMiddleware.test.ts` passes.
- [x] `npx vitest run src/modules/auth/` passes.
**Dependencies:** None  
**Files touched:**
- `server/src/shared/middleware/gatewayRateLimiterMiddleware.ts`
- `server/src/modules/auth/middleware/authRateLimiterMiddleware.ts`
- `server/src/modules/auth/routes/auth.routes.ts`
- `server/src/shared/middleware/gatewayMiddleware.test.ts`
**Estimated scope:** Medium (4 files)

---

## Checkpoint 1: Security Hardening & Throttling
- [x] Zero committed passwords or shared hashes across compose files.
- [x] Redis sliding-window and auth brute-force limiters active with LRU fallback.
- [x] All auth and gateway middleware tests pass green (`npx vitest run src/shared/middleware/ src/modules/auth/`).

---

## Milestone 2: Zero-Trust Tenant Isolation (P0)

### Task 3: Update SQL RLS Policies to Fail Closed & Cover Missing Tables
**Description:** Create a new database migration that modifies PostgreSQL Row Level Security (RLS) policies. Change the default behavior when `app.current_tenant_id` is unset or empty from "return all rows" to "fail closed" (return zero rows). Add RLS policies and `FORCE ROW LEVEL SECURITY` to previously omitted tables (`tenants`, `plans`, `round_robin_state`).
**Acceptance criteria:**
- [x] Migration SQL revokes fail-open fallback (`current_tenant_id IS NULL OR current_tenant_id = '' OR current_tenant_id = 'ALL'`).
- [x] Tenant tables only return rows where `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')`.
- [x] `ALTER TABLE ... FORCE ROW LEVEL SECURITY` applied to prevent table owners from bypassing RLS.
- [x] `tenants`, `plans`, and `round_robin_state` have explicit RLS policies defined.
**Verification:**
- [x] Migration applies cleanly: `npm -w server run db:migrate`.
- [x] Manual SQL test in psql verifies an unauthenticated query returns 0 rows.
**Dependencies:** Task 1  
**Files touched:**
- `server/src/shared/db/migrations/039_fail_closed_row_level_security.sql`
- `server/src/shared/db/schema.ts`
**Estimated scope:** Small (2 files)

---

### Task 4: Wire Gateway `AsyncLocalStorage` Tenant Context Middleware
**Description:** Implement `gatewayTenantContextMiddleware.ts` using Node.js `AsyncLocalStorage` (ALS). For all tenant-scoped requests, establish `tenantId` from JWT/session, bind it to context, and wrap database queries in a scoped session executing `SET LOCAL app.current_tenant_id = :tenantId`. Ensure system and public routes (`health`, `webhooks`, `auth`) can bypass gracefully without breaking.
**Acceptance criteria:**
- [x] Gateway ALS middleware binds `tenantId`, `userId`, and connection context to async execution scope.
- [x] Database client automatically runs within tenant context for all domain services (`db.query.*`) without needing manual 1-line repository wrappers (conforming to ADR-001).
- [x] Public routes (`/api/v1/health`, `/api/v1/auth/login`, PayPal webhooks) are marked with `skipTenantContext: true` and execute without failure.
- [x] Requests to tenant routes without a valid tenant context fail closed with `ForbiddenError('TENANT_CONTEXT_REQUIRED')`.
**Verification:**
- [x] `npx vitest run src/shared/middleware/` passes.
- [x] `npm -w server run build` / lint compiles cleanly.
**Dependencies:** Task 3  
**Files touched:**
- `server/src/shared/middleware/gatewayTenantContextMiddleware.ts`
- `server/src/shared/db/tenantContext.ts`
- `server/src/routes/index.ts`
**Estimated scope:** Small (3 files)

---

### Task 5: Implement Automated Cross-Tenant Leak Test Suite
**Description:** Create an automated integration test suite (`tenantLeak.spec.ts`) that asserts tenant isolation at the database and HTTP levels. Verify that Tenant A cannot query, update, or delete Tenant B records with and without manual `where(eq(...))` filters.
**Acceptance criteria:**
- [x] Test creates two distinct tenants (Tenant A and Tenant B) with test tickets and invoices.
- [x] Querying under Tenant A context with RLS active returns exactly 0 records belonging to Tenant B.
- [x] Executing a query without any `tenantId` set in context returns 0 records (verifying fail-closed behavior).
- [x] Attempting to cross-update Tenant B record from Tenant A context throws a forbidden or not found error.
**Verification:**
- [x] `npx vitest run src/shared/db/tenantLeak.spec.ts` passes 100%.
**Dependencies:** Task 3, Task 4  
**Files touched:**
- `server/src/shared/db/tenantLeak.spec.ts`
**Estimated scope:** Small (1 file)

---

## Checkpoint 2: Tenant Isolation & Leak Immunity
- [x] Fail-closed RLS migration active in database.
- [x] ALS Gateway context sets `SET LOCAL app.current_tenant_id` automatically.
- [x] Cross-tenant leak test suite passes with zero leaks.
- [x] All 127+ existing unit tests pass (`npm -w server run test`).

---

## Milestone 3: Contract Conformance & Developer Tooling (P1)

### Task 6: Reconcile Drizzle Config & Add CI Migration Drift Check
**Description:** Fix path references in `server/drizzle.config.ts` so `drizzle-kit` correctly locates `src/shared/db/schema.ts` and migration files. Regenerate and reconcile the migration meta snapshot to cover all 24 database tables. Add a check script in `server/package.json` (`db:check`) that validates schema and migration integrity.
**Acceptance criteria:**
- [x] `server/drizzle.config.ts` schema and out paths point accurately to relative TypeScript sources.
- [x] `server/src/shared/db/migrations/meta/` reflects schema snapshot accurately.
- [x] `drizzle-kit check` executes cleanly without warnings (`npm -w server run db:check`).
- [x] Dedicated `db:check` script available in server workspace.
**Verification:**
- [x] `npm -w server run db:check` runs without errors (`Everything's fine 🐶🔥`).
**Dependencies:** Task 3  
**Files touched:**
- `server/drizzle.config.ts`
- `server/package.json`
**Estimated scope:** Small (2 files)

---

### Task 7: Build Supertest API Integration Suite Using `@shared/contracts`
**Description:** Implement contract-first API integration tests using Supertest that validate live Express routes directly against canonical Zod schemas in `@shared/contracts` (conforming to ADR-001). Cover authentication, ticket lifecycle, and billing checkout endpoints.
**Acceptance criteria:**
- [x] Supertest integration harness initialized in `server/tests/integration/`.
- [x] Tests validate response payloads against `CreateTicketInputSchema`, `TicketResponseSchema`, and `InvoiceResponseSchema`.
- [x] Response payloads with schema drift or missing fields immediately fail tests.
- [x] Supertest integration script added to `server/package.json` (`test:integration`).
**Verification:**
- [x] `npm -w server run test:integration` passes.
**Dependencies:** Task 2, Task 4  
**Files touched:**
- `server/tests/integration/contractConformance.test.ts`
- `server/package.json`
- `server/src/index.ts`
**Estimated scope:** Small (3 files)

---

### Task 8: Implement ADR-002 Boundary & Entity Invariant Lint Rules
**Description:** Add architectural linting rules enforcing ADR-002 invariants on the frontend: (1) forbid cross-feature deep imports (all imports must pass through `features/<domain>/index.ts`), and (2) strictly ban declaring local entity interfaces in `client/src/features/*/types.ts` (entities must be imported from `@shared/contracts`).
**Acceptance criteria:**
- [x] ESLint boundary/import rule configured in `client/eslint.config.js` flagging deep imports into `@/features/*/*`.
- [x] Custom AST lint rule flags backend entity interface and type declarations in client `types.ts` files.
- [x] Existing codebase passes lint checks with zero errors.
- [x] Quality gates enforce boundary linting.
**Verification:**
- [x] `npm -w client run lint` runs and passes with zero errors.
**Dependencies:** None  
**Files touched:**
- `client/eslint.config.js`
**Estimated scope:** Small (1 file)

---

### Task 9: Configure Vitest Coverage Gates & Optimize Server Build Memory
**Description:** Configure `@vitest/coverage-v8` in server and client with reporting outputs. Tune TypeScript compilation flags and memory limits (`--max-old-space-size=4096`) in `server/package.json` to prevent out-of-memory crashes on constrained hosts.
**Acceptance criteria:**
- [x] Server and client configure Vitest coverage reporting with HTML/LCOV outputs.
- [x] Server build script optimizes `tsc` execution with heap configuration, resolving G-11 OOM instability.
**Verification:**
- [x] `npm -w server run test:coverage` and client coverage configuration active.
- [x] `server/tsconfig.build.json` strips bloated types (`vitest/globals`) and declarations during production build.
**Dependencies:** Task 7, Task 8  
**Files touched:**
- `server/vitest.config.ts`
- `client/vite.config.ts`
- `server/package.json`
- `server/tsconfig.build.json`
**Estimated scope:** Medium (4 files)

---

## Checkpoint 3: Contract Conformance & CI Quality Gates
- [x] Drizzle migrations and schema in 100% sync verified by `db:check`.
- [x] Supertest contract conformance suite passing against `@shared/contracts`.
- [x] ADR-002 boundary rules mechanically enforced by linter.
- [x] Coverage floors active and server build memory stable.

---

## Milestone 4: Observability & Client Experience (P1/P2)

### Task 10: Propagate Request-ID & W3C Trace Context to Winston & Datadog
**Description:** Implement `requestIdMiddleware.ts` to assign or propagate incoming `X-Request-Id` and W3C `traceparent` headers. Inject request ID, tenant ID, and route duration into Winston structured JSON metadata, Datadog APM spans, and PostgreSQL query tags via `sql_commenter`.
**Acceptance criteria:**
- [x] Every incoming HTTP request is assigned a unique `X-Request-Id` (returned in response headers).
- [x] All Winston log lines automatically include `{ requestId, tenantId, path, method }`.
- [x] If an incoming request includes a W3C `traceparent` or Datadog trace header, it is extracted and linked to the active APM span.
- [x] Unit tests in `requestIdMiddleware.test.ts` verify header assignment, propagation, and structured logging.
**Verification:**
- [x] `npx vitest run src/shared/middleware/requestIdMiddleware.test.ts` passes (5/5 tests green).
**Dependencies:** Task 4  
**Files touched:**
- `server/src/shared/middleware/requestIdMiddleware.ts`
- `server/src/shared/middleware/requestIdMiddleware.test.ts`
- `server/src/shared/utils/logger.ts`
- `server/src/routes/index.ts`
**Estimated scope:** Small (4 files)

---

### Task 11: Implement PWA Offline Shell with TanStack Query Cache Persistence
**Description:** Introduce Progressive Web App (PWA) offline support for the client app. Add a web app manifest, register a lightweight service worker, and integrate TanStack Query's official `persistQueryClient` plugin with `idb-keyval` / `localStorage` to cache dashboard reads offline (conforming to ADR-001).
**Acceptance criteria:**
- [x] `client/public/manifest.webmanifest` configured with portal branding, icons, and theme color.
- [x] Service worker caches the application shell (HTML, CSS, JS assets) for offline loading.
- [x] TanStack Query client persists cached queries with versioned cache keys (`msp_portal_cache_v1`).
- [x] Client builds cleanly with PWA assets generated.
**Verification:**
- [x] `npm -w client run build` succeeds (built in 3.66s, all PWA assets present in `client/dist`).
**Dependencies:** None  
**Files touched:**
- `client/public/manifest.webmanifest`
- `client/public/sw.js`
- `client/src/main.tsx`
- `client/src/lib/queryClient.ts`
**Estimated scope:** Small (4 files)

---

### Task 12: Configure Automated axe-core Accessibility Suite in CI
**Description:** Add automated web accessibility auditing using `vitest-axe` and `axe-core`. Create automated tests for core layouts, tables, and dialogs asserting WCAG 2.1 AA compliance with zero critical accessibility violations.
**Acceptance criteria:**
- [x] Automated a11y tests created for core primitives (Buttons, Forms, Tables, Cards).
- [x] Tests assert 0 critical or serious WCAG 2.1 AA accessibility violations.
- [x] Client package includes `"test:a11y"` npm script.
**Verification:**
- [x] `npm -w client run test:a11y` passes cleanly (4/4 test suites green, zero violations).
**Dependencies:** Task 8  
**Files touched:**
- `client/tests/a11y/accessibility.test.tsx`
- `client/src/test/setup.ts`
- `client/package.json`
**Estimated scope:** Small (3 files)

---

## Checkpoint 4: SOTA Definition of Done Cleared
- [x] End-to-end request ID and trace correlation visible in Winston logs.
- [x] PWA offline app shell operational with TanStack Query persistence.
- [x] Automated accessibility audit passing WCAG 2.1 AA (`vitest-axe`).
- [x] All 12 SOTA roadmap items resolved and verified.
