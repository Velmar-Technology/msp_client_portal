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

---

## Milestone 5: ADR-002 Feature Architecture Enforcement & Scaffolding Engine

### Task 13: Fortify ESLint Flat Config AST Rules for ADR-002 Invariants
**Description:** Update `client/eslint.config.js` to strictly enforce ADR-002 boundary rules. Close the cross-feature deep import loophole by ensuring `src/**/*.{ts,tsx}` cannot deep import from `@/features/*/*` or relative paths into peer feature subdirectories, while allowing intra-feature relative imports. Expand AST selectors to forbid any interface/type declarations matching `*Input`, `*Response`, `*Contract`, `*Payload`, `*Filter`, `*DTO`, or domain entity names in `src/features/**/types.ts`.
**Acceptance criteria:**
- [x] Deep imports into `@/features/*/*` from pages, components, routes, and peer features are flagged as errors.
- [x] Intra-feature relative imports (e.g. `../components/`, `./useQueries`) remain allowed for files within the same feature.
- [x] Any interface or type alias resembling a server contract in `src/features/**/types.ts` is flagged with a clear guidance error message.
- [x] Existing grandfathered code in `client/src/components/` and `client/src/pages/` continues to pass linting without regression.
**Verification:**
- [x] `npm -w client run lint` passes on clean feature code.
- [x] Verified via AST rules in `client/eslint.config.js`.
**Dependencies:** None  
**Files touched:**
- `client/eslint.config.js`
**Estimated scope:** Small (1 file)

---

### Task 14: Automated Architecture Test Suite in Vitest
**Description:** Create an automated architectural test suite (`client/tests/arch/feature-architecture.test.ts`) that verifies structural conformance across `client/src/features/`. Asserts that every feature directory contains an `index.ts` public gateway, that only public gateways are exported, and that zero duplicate contracts exist. Add `"test:arch"` to `client/package.json`.
**Acceptance criteria:**
- [x] Test scans `client/src/features/` and asserts every domain has an `index.ts`.
- [x] Test scans imports across `client/src/` and asserts 0 deep imports into feature internals.
- [x] Test verifies that feature `types.ts` only exports ephemeral UI types.
- [x] `"test:arch"` npm script configured in `client/package.json`.
**Verification:**
- [x] `npm -w client run test:arch` passes 100% green (4/4 tests passed).
**Dependencies:** Task 13  
**Files touched:**
- `client/tests/arch/feature-architecture.test.ts`
- `client/package.json`
**Estimated scope:** Small (2 files)

---

### Task 15: Canonical Feature Scaffolding Engine
**Description:** Implement `client/scripts/gen-feature.mjs` and wire it to `"gen:feature": "node scripts/gen-feature.mjs"` in `client/package.json`. Stubs out the canonical 7-item vertical slice anatomy (`api/`, `components/`, `hooks/`, `pages/`, `types.ts`, `index.ts`) pre-configured with `@shared/contracts` imports, TanStack Query hooks, query keys, and `zodResolver` forms.
**Acceptance criteria:**
- [x] Running `npm -w client run gen:feature <domain>` generates all 7 files with valid TypeScript syntax.
- [x] Generated feature passes `npm -w client run lint` and `npm -w client run test:arch` with 0 errors immediately out of the box.
- [x] Script gracefully aborts if the feature directory already exists (prevents accidental overwrites).
**Verification:**
- [x] Generated test feature (`sample-demo`), verified green via `test:arch` and `eslint`, cleaned up cleanly.
**Dependencies:** Task 13, Task 14  
**Files touched:**
- `client/scripts/gen-feature.mjs`
- `client/package.json`
**Estimated scope:** Small (2 files)

---

### Task 16: Canonical Feature Slice Recipe & Documentation Update
**Description:** Update `docs/architecture/feature-slice-recipe.md` with the complete feature creation guide, command usage (`npm -w client run gen:feature`), directory anatomy rules, and the ADR-002 invariant matrix.
**Acceptance criteria:**
- [x] Document explains the 4-step vertical slice with the automated generator.
- [x] Directory layout diagram matches the 7-part standard.
- [x] Clear guidelines provided on the single contract truth and public gateway boundaries.
**Verification:**
- [x] Documentation links and code snippets verified for correctness.
**Dependencies:** Task 15  
**Files touched:**
- `docs/architecture/feature-slice-recipe.md`
**Estimated scope:** Small (1 file)

---

## Checkpoint 5: ADR-002 Enforcement & Scaffolding Engine Cleared
- [x] `client/eslint.config.js` blocks cross-feature deep imports and duplicate contracts.
- [x] `npm -w client run test:arch` runs and passes in Vitest.
- [x] `npm -w client run gen:feature` operational and tested.
- [x] `docs/architecture/feature-slice-recipe.md` updated with the canonical recipe.
- [x] Full client build and tests green (`npm -w client run build`, `npm -w client run test:run`).

---

## Milestone 6: Migrate Billing Module to ADR-002 Colocated Architecture (Slice 2)

### Task 17: Extract Billing Modals & Presentation Components into `client/src/features/billing/components/`
**Description:** Extract `PayModal`, `MarkPaidConfirmModal`, `CancelInvoiceConfirmModal`, and `InvoiceDetailsModal` from `BillingPage.tsx` into standalone, reusable feature components in `client/src/features/billing/components/`. All component props must import entity contracts directly from `@shared/contracts`.
**Acceptance criteria:**
- [x] `PayModal.tsx` handles PayPal and bank transfer flows with strict typing.
- [x] `MarkPaidConfirmModal.tsx` and `CancelInvoiceConfirmModal.tsx` handle administrative actions.
- [x] `InvoiceDetailsModal.tsx` displays full invoice lines with download triggers.
- [x] Components import entity types (`InvoiceContract`) directly from `@shared/contracts`.
**Verification:**
- [x] TypeScript compilation succeeds (`npm -w client run build` passed in 2.19s).
**Dependencies:** None  
**Files touched:**
- `client/src/features/billing/components/PayModal.tsx`
- `client/src/features/billing/components/MarkPaidConfirmModal.tsx`
- `client/src/features/billing/components/CancelInvoiceConfirmModal.tsx`
- `client/src/features/billing/components/InvoiceDetailsModal.tsx`
**Estimated scope:** Medium (4 files)

---

### Task 18: Colocate `useBilling` Hook & Ephemeral Types into `client/src/features/billing/`
**Description:** Move `useBilling.ts` into `client/src/features/billing/hooks/useBilling.ts`. Create `client/src/features/billing/types.ts` strictly for ephemeral UI state (`BillingTab`, `PaymentMethod`, `BillingModalType`). Re-export from `client/src/hooks/useBilling.ts` for backward compatibility.
**Acceptance criteria:**
- [x] `client/src/features/billing/types.ts` contains only ephemeral UI state.
- [x] `useBilling.ts` orchestrates invoice filtering, pagination, and modal state inside the feature.
- [x] `client/src/hooks/useBilling.ts` re-exports from `@/features/billing`.
**Verification:**
- [x] `npm -w client run test:arch` passes.
**Dependencies:** Task 17  
**Files touched:**
- `client/src/features/billing/types.ts`
- `client/src/features/billing/hooks/useBilling.ts`
- `client/src/hooks/useBilling.ts`
**Estimated scope:** Small (3 files)

---

### Task 19: Colocate `BillingPage` and Vitest Test into `client/src/features/billing/pages/`
**Description:** Colocate `BillingPage.tsx` and `BillingPage.test.tsx` inside `client/src/features/billing/pages/`. Clean up the page component by delegating to the extracted modal components and colocated hooks. Re-export from `client/src/pages/BillingPage/index.ts`.
**Acceptance criteria:**
- [x] `BillingPage.tsx` consumes colocated modals and `useBilling` cleanly.
- [x] `BillingPage.test.tsx` runs inside the feature and tests modal interactions and payments.
- [x] `client/src/pages/BillingPage/index.ts` re-exports from `@/features/billing`.
**Verification:**
- [x] `npx vitest run client/src/features/billing` passes 100% green (13/13 tests).
**Dependencies:** Task 17, Task 18  
**Files touched:**
- `client/src/features/billing/pages/BillingPage.tsx`
- `client/src/features/billing/pages/BillingPage.test.tsx`
- `client/src/pages/BillingPage/index.ts`
**Estimated scope:** Small (3 files)

---

### Task 20: Wire `client/src/features/billing/index.ts` Public Gateway & Update Route Imports
**Description:** Update `client/src/features/billing/index.ts` to export all public capabilities (`BillingPage`, `useBilling`, query hooks, and UI types). Update `client/src/routes/_app/billing.tsx` to import `BillingPage` directly from `@/features/billing`.
**Acceptance criteria:**
- [x] `client/src/features/billing/index.ts` exposes the feature's public API.
- [x] `client/src/routes/_app/billing.tsx` imports from `@/features/billing`.
- [x] Zero deep imports into `@/features/billing/*` exist across the codebase.
**Verification:**
- [x] `npm -w client run test:arch` passes.
- [x] `npm -w client run lint` passes with 0 errors.
- [x] `npm -w client run build` succeeds.
**Dependencies:** Task 19  
**Files touched:**
- `client/src/features/billing/index.ts`
- `client/src/routes/_app/billing.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 6: Billing Module Migration Cleared
- [x] `client/src/features/billing` contains complete 7-part vertical slice.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes (`npm -w client run lint`).
- [x] Client builds cleanly (`npm -w client run build`).
- [x] All unit and integration tests pass (`npm -w client run test:run`).

---

## Milestone 7: Migrate Equipment & Devices Module to ADR-002 Colocated Architecture (Slice 4)

### Task 21: Scaffold `client/src/features/equipment/` & Colocate API Queries
**Description:** Scaffold `client/src/features/equipment/` and create `api/useEquipmentQueries.ts` consolidating `useEquipment.ts` and `useDeviceQueries.ts`. Provide query keys (`EQUIPMENT_QUERY_KEYS`) and mutation hooks (`useActivateWithOtp`, `useDeactivateSlot`, `useBulkDeactivate`). Define ephemeral UI types in `types.ts`. Re-export from legacy query files.
**Acceptance criteria:**
- [x] `client/src/features/equipment/api/useEquipmentQueries.ts` exports all equipment query and mutation hooks.
- [x] `client/src/features/equipment/types.ts` contains ephemeral UI state with zero duplicate backend entity types.
- [x] Legacy hook `client/src/hooks/queries/useEquipment.ts` re-exports from `@/features/equipment`.
**Verification:**
- [x] `npx vitest run client/src/hooks/queries/useEquipment.test.tsx` passes (3/3 tests).
**Dependencies:** None  
**Files touched:**
- `client/src/features/equipment/api/useEquipmentQueries.ts`
- `client/src/features/equipment/types.ts`
- `client/src/hooks/queries/useEquipment.ts`
**Estimated scope:** Small (3 files)

---

### Task 22: Colocate Equipment & Device Modal Components
**Description:** Move `ActivateWithOtpModal.tsx`, `AddAdminDeviceModal.tsx`, `DeployAgentModal.tsx`, and `NextcloudInfoModal.tsx` into `client/src/features/equipment/components/`. All component props must import entity contracts directly from `@shared/contracts`. Update `client/src/components/devices/index.ts` to re-export from `@/features/equipment`.
**Acceptance criteria:**
- [x] Device modals colocated inside `client/src/features/equipment/components/`.
- [x] All props use direct contracts (`SubscriptionEquipment` from `@shared/contracts`).
- [x] `client/src/components/devices/index.ts` re-exports the moved modals.
**Verification:**
- [x] TypeScript compilation succeeds: `npx tsc --noEmit -p client/tsconfig.app.json`.
**Dependencies:** Task 21  
**Files touched:**
- `client/src/features/equipment/components/ActivateWithOtpModal.tsx`
- `client/src/features/equipment/components/AddAdminDeviceModal.tsx`
- `client/src/features/equipment/components/DeployAgentModal.tsx`
- `client/src/features/equipment/components/NextcloudInfoModal.tsx`
- `client/src/components/devices/index.ts`
**Estimated scope:** Medium (5 files)

---

### Task 23: Colocate Device Filter & Modal Hooks
**Description:** Colocate `useDeviceFilters.ts`, `useDeviceModals.ts`, and the page orchestrator `useDevicesPage.ts` into `client/src/features/equipment/hooks/`. Re-export from `client/src/hooks/useDevicesPage.ts` and `client/src/hooks/devices/` for backward compatibility.
**Acceptance criteria:**
- [x] `useDeviceFilters.ts`, `useDeviceModals.ts`, and `useDevicesPage.ts` live in `client/src/features/equipment/hooks/`.
- [x] Legacy `client/src/hooks/useDevicesPage.ts` re-exports from `@/features/equipment`.
- [x] URL state synchronization preserves `search`, `status`, `client`, `plan`, `page`, and `limit`.
**Verification:**
- [x] `npm -w client run test:arch` passes (5/5 tests).
**Dependencies:** Task 21, Task 22  
**Files touched:**
- `client/src/features/equipment/hooks/useDeviceFilters.ts`
- `client/src/features/equipment/hooks/useDeviceModals.ts`
- `client/src/features/equipment/hooks/useDevicesPage.ts`
- `client/src/hooks/useDevicesPage.ts`
**Estimated scope:** Small (4 files)

---

### Task 24: Colocate `DevicesPage` and Vitest Test into `client/src/features/equipment/pages/`
**Description:** Colocate `DevicesPage.tsx` and `DevicesPage.test.tsx` into `client/src/features/equipment/pages/`. Update imports to use colocated components, hooks, and contracts. Re-export from `client/src/pages/DevicesPage/index.ts`.
**Acceptance criteria:**
- [x] `DevicesPage.tsx` consumes colocated modals and hooks cleanly.
- [x] `DevicesPage.test.tsx` passes 13/13 tests from its colocated directory.
- [x] `client/src/pages/DevicesPage/index.ts` and `DevicesPage.tsx` re-export from `@/features/equipment`.
**Verification:**
- [x] `npx vitest run client/src/features/equipment/pages/DevicesPage.test.tsx` passes 100% green.
**Dependencies:** Task 22, Task 23  
**Files touched:**
- `client/src/features/equipment/pages/DevicesPage.tsx`
- `client/src/features/equipment/pages/DevicesPage.test.tsx`
- `client/src/pages/DevicesPage/index.ts`
- `client/src/pages/DevicesPage/DevicesPage.tsx`
**Estimated scope:** Medium (4 files)

---

### Task 25: Wire Public Gateway (`client/src/features/equipment/index.ts`) & Update Routes
**Description:** Expose authorized public exports in `client/src/features/equipment/index.ts` (`DevicesPage`, `useDevicesPage`, queries, modals, and ephemeral types). Update `client/src/routes/_app/devices.tsx` and `client/src/routes/_app/rmm.tsx` to import `DevicesPage` directly from `@/features/equipment`.
**Acceptance criteria:**
- [x] `client/src/features/equipment/index.ts` exposes the feature's public API.
- [x] Routes `_app/devices.tsx` and `_app/rmm.tsx` import directly from `@/features/equipment`.
- [x] Zero deep imports into `@/features/equipment/*` exist across the codebase.
**Verification:**
- [x] `npm -w client run test:arch` passes.
- [x] `npm -w client run lint` passes with 0 errors.
- [x] `npm -w client run build` succeeds (2.23s).
**Dependencies:** Task 24  
**Files touched:**
- `client/src/features/equipment/index.ts`
- `client/src/routes/_app/devices.tsx`
- `client/src/routes/_app/rmm.tsx`
**Estimated scope:** Small (3 files)

---

## Checkpoint 7: Equipment Module Migration Cleared
- [x] `client/src/features/equipment` contains complete 7-part vertical slice.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes (`npm -w client run lint`).
- [x] Client builds cleanly (`npm -w client run build`).
- [x] All unit and integration tests pass (`npm -w client run test:run`).

---

## Milestone 8: Migrate Tickets Module to ADR-002 Colocated Architecture (P0)

### Task 26: Scaffold `client/src/features/tickets/` & Colocate Ticket API Queries
**Description:** Scaffold `client/src/features/tickets/` using the scaffolding template and colocate `useTicketQueries.ts` and `ticketService.ts` inside `client/src/features/tickets/api/`. Consolidate query keys (`TICKET_QUERY_KEYS`), query hooks (`useTickets`, `useTicketDetail`, `useTicketEvents`), and mutation hooks (`useCreateTicket`, `useUpdateTicketStatus`, `useAssignTechnician`, `useAddTicketComment`). Restrict `types.ts` strictly to ephemeral UI state. Re-export from legacy `client/src/hooks/queries/useTickets.ts` and `client/src/services/ticketService.ts`.
**Acceptance criteria:**
- [ ] `client/src/features/tickets/api/useTicketQueries.ts` exports all ticket TanStack Query and mutation hooks.
- [ ] `client/src/features/tickets/types.ts` contains ephemeral UI types with zero duplicate backend entity types.
- [ ] Legacy `client/src/hooks/queries/useTickets.ts` re-exports from `@/features/tickets`.
**Verification:**
- [ ] Tests pass: `npx vitest run client/src/hooks/queries/useTickets.test.tsx`
- [ ] Build succeeds: `npm -w client run build`
- [ ] Manual check: verify query cache keys match contract definitions
**Dependencies:** None  
**Files touched:**
- `client/src/features/tickets/api/useTicketQueries.ts`
- `client/src/features/tickets/api/ticketService.ts`
- `client/src/features/tickets/types.ts`
- `client/src/hooks/queries/useTickets.ts`
**Estimated scope:** Medium (4 files)

---

### Task 27: Colocate Ticket Presentation Components, Drawer & Modals
**Description:** Move ticket UI components from `client/src/components/tickets/` and `client/src/components/new-ticket-modal.tsx` into `client/src/features/tickets/components/` (`TicketTable.tsx`, `TicketFilters.tsx`, `TicketDrawer.tsx`, `TicketCommentFeed.tsx`, `NewTicketModal.tsx`, `AssignTechnicianModal.tsx`, `TicketStatusBadge.tsx`). Ensure all props import entity contracts directly from `@shared/contracts`. Update `client/src/components/tickets/index.ts` to re-export.
**Acceptance criteria:**
- [ ] Ticket UI components and modals colocated in `client/src/features/tickets/components/`.
- [ ] All component prop types use `@shared/contracts` directly.
- [ ] `client/src/components/tickets/index.ts` re-exports moved components for backward compatibility.
**Verification:**
- [ ] Tests pass: `npm -w client run test:arch`
- [ ] Build succeeds: `npx tsc --noEmit -p client/tsconfig.app.json`
- [ ] Manual check: ensure no visual regression in ticket drawer or modals
**Dependencies:** Task 26  
**Files touched:**
- `client/src/features/tickets/components/TicketTable.tsx`
- `client/src/features/tickets/components/TicketDrawer.tsx`
- `client/src/features/tickets/components/NewTicketModal.tsx`
- `client/src/features/tickets/components/AssignTechnicianModal.tsx`
- `client/src/components/tickets/index.ts`
**Estimated scope:** Large (5+ files)

---

### Task 28: Colocate Ticket Filters, SLA Timers & Modal Hooks
**Description:** Colocate `useTicketsPage.ts`, `useTicketDetail.ts`, `useSLATimer.ts`, and modal state hooks into `client/src/features/tickets/hooks/`. Synchronize table filters (`?status=...`, `?priority=...`, `?search=...`, `?page=...`) and drawer inspection (`?inspectId=...`) using `useUrlState`. Re-export from legacy `client/src/hooks/`.
**Acceptance criteria:**
- [ ] `useTicketsPage.ts`, `useTicketDetail.ts`, and `useSLATimer.ts` reside in `client/src/features/tickets/hooks/`.
- [ ] URL state synchronization functions without state loss.
- [ ] Legacy hook paths in `client/src/hooks/` re-export from `@/features/tickets`.
**Verification:**
- [ ] Tests pass: `npx vitest run client/src/hooks/useTicketsPage.test.ts` (if exists) or unit tests
- [ ] Build succeeds: `npm -w client run build`
- [ ] Manual check: test SLA countdown timer rendering
**Dependencies:** Task 26, Task 27  
**Files touched:**
- `client/src/features/tickets/hooks/useTicketsPage.ts`
- `client/src/features/tickets/hooks/useTicketDetail.ts`
- `client/src/features/tickets/hooks/useSLATimer.ts`
- `client/src/hooks/useTicketsPage.ts`
**Estimated scope:** Small (4 files)

---

### Task 29: Colocate `TicketsPage` & `TicketDetailPage` with Vitest Tests into `client/src/features/tickets/pages/`
**Description:** Move `TicketsPage.tsx` and `TicketDetailPage.tsx` along with their Vitest test files into `client/src/features/tickets/pages/`. Update imports to consume colocated components, hooks, and queries. Re-export from `client/src/pages/TicketsPage/index.ts` and `client/src/pages/TicketDetailPage/index.ts`.
**Acceptance criteria:**
- [ ] `TicketsPage.tsx` and `TicketDetailPage.tsx` cleanly consume colocated components and hooks.
- [ ] Vitest test suites execute and pass from inside `client/src/features/tickets/pages/`.
- [ ] Legacy page folders re-export from `@/features/tickets`.
**Verification:**
- [ ] Tests pass: `npx vitest run client/src/features/tickets`
- [ ] Build succeeds: `npm -w client run build`
- [ ] Manual check: verify ticket detail timeline and comment posting
**Dependencies:** Task 27, Task 28  
**Files touched:**
- `client/src/features/tickets/pages/TicketsPage.tsx`
- `client/src/features/tickets/pages/TicketsPage.test.tsx`
- `client/src/features/tickets/pages/TicketDetailPage.tsx`
- `client/src/pages/TicketsPage/index.ts`
- `client/src/pages/TicketDetailPage/index.ts`
**Estimated scope:** Medium (5 files)

---

### Task 30: Wire `client/src/features/tickets/index.ts` Public Gateway & Update Route Imports
**Description:** Expose all authorized public exports in `client/src/features/tickets/index.ts` (`TicketsPage`, `TicketDetailPage`, `useTicketQueries`, modals, UI types). Update route definitions in `client/src/protected-routes.tsx` and `client/src/routes/` to import directly from `@/features/tickets`.
**Acceptance criteria:**
- [ ] `client/src/features/tickets/index.ts` is the sole entry point for ticket domain capabilities.
- [ ] Routes import `TicketsPage` and `TicketDetailPage` from `@/features/tickets`.
- [ ] Zero deep imports into `@/features/tickets/*` across the monorepo.
**Verification:**
- [ ] Tests pass: `npm -w client run test:arch`
- [ ] Build succeeds: `npm -w client run lint && npm -w client run build`
- [ ] Manual check: route navigation to `/tickets` and `/tickets/:id` functions seamlessly
**Dependencies:** Task 29  
**Files touched:**
- `client/src/features/tickets/index.ts`
- `client/src/protected-routes.tsx`
- `client/src/routes/_app/tickets.tsx`
**Estimated scope:** Small (3 files)

---

## Checkpoint 8: Tickets Module Migration Cleared
- [ ] `client/src/features/tickets` contains complete 7-part vertical slice.
- [ ] Architecture tests pass (`npm -w client run test:arch`).
- [ ] ESLint passes (`npm -w client run lint`).
- [ ] Client builds cleanly (`npm -w client run build`).
- [ ] All ticket unit and integration tests pass (`npm -w client run test:run`).

---

## Milestone 9: Migrate Subscriptions & Plans Module to ADR-002 Colocated Architecture (P0)

### Task 31: Scaffold `client/src/features/subscriptions/` & Colocate Subscription/Plan API Queries
**Description:** Scaffold `client/src/features/subscriptions/` and create `api/useSubscriptionQueries.ts` consolidating `planService.ts`, `subscriptionService.ts`, and `useSubscriptions.ts`. Export query hooks (`usePlans`, `useMySubscription`, `useActivePlans`) and mutation hooks (`useCreatePayPalOrder`, `useCaptureSubscription`, `useUpdatePlan`). Re-export from legacy query files.
**Acceptance criteria:**
- [x] `client/src/features/subscriptions/api/useSubscriptionQueries.ts` exports all subscription/plan queries and mutations.
- [x] `types.ts` contains ephemeral UI state with zero duplicate contract entities.
- [x] Legacy `client/src/hooks/queries/useSubscriptions.ts` re-exports from `@/features/subscriptions`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/hooks/queries/useSubscriptions.test.tsx`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: verify PayPal capture endpoint integration
**Dependencies:** None  
**Files touched:**
- `client/src/features/subscriptions/api/useSubscriptionQueries.ts`
- `client/src/features/subscriptions/api/subscriptionService.ts`
- `client/src/features/subscriptions/types.ts`
- `client/src/hooks/queries/useSubscriptions.ts`
**Estimated scope:** Medium (4 files)

---

### Task 32: Colocate Checkout Sheet, Plan Cards & Plan Editor Components
**Description:** Move subscription and plan components from `client/src/components/checkout/` and `client/src/components/checkout-sheet.tsx` into `client/src/features/subscriptions/components/` (`PlanCard.tsx`, `PlanComparisonTable.tsx`, `CheckoutSheet.tsx`, `PayPalButtonContainer.tsx`, `PlanEditorModal.tsx`).
**Acceptance criteria:**
- [x] Checkout and plan components colocated in `client/src/features/subscriptions/components/`.
- [x] All props use `@shared/contracts` schemas.
- [x] `client/src/components/checkout/index.ts` re-exports moved components.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npx tsc --noEmit -p client/tsconfig.app.json`
- [x] Manual check: test checkout sheet opening and plan tier selection
**Dependencies:** Task 31  
**Files touched:**
- `client/src/features/subscriptions/components/PlanCard.tsx`
- `client/src/features/subscriptions/components/CheckoutSheet.tsx`
- `client/src/features/subscriptions/components/PlanComparisonTable.tsx`
- `client/src/components/checkout/index.ts`
**Estimated scope:** Medium (4 files)

---

### Task 33: Colocate Plans & Checkout Hooks
**Description:** Colocate `usePlansPage.ts`, `useCheckout.ts`, and billing cycle toggle hooks into `client/src/features/subscriptions/hooks/`. Synchronize plan tab selection and checkout modal query parameters via `useUrlState`. Re-export from legacy `client/src/hooks/`.
**Acceptance criteria:**
- [x] `usePlansPage.ts` and `useCheckout.ts` colocated in `client/src/features/subscriptions/hooks/`.
- [x] URL parameters (`?plan=...`, `?cycle=annual`) sync correctly.
- [x] Legacy `client/src/hooks/usePlansPage.ts` re-exports from `@/features/subscriptions`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test billing cycle toggle (Monthly vs Annual discount calculation)
**Dependencies:** Task 31, Task 32  
**Files touched:**
- `client/src/features/subscriptions/hooks/usePlansPage.ts`
- `client/src/features/subscriptions/hooks/useCheckout.ts`
- `client/src/hooks/usePlansPage.ts`
- `client/src/hooks/useCheckout.ts`
**Estimated scope:** Small (4 files)

---

### Task 34: Colocate `PlansPage` & `PlanEditorPage` with Vitest Tests into `client/src/features/subscriptions/pages/`
**Description:** Colocate `PlansPage.tsx` and `PlanEditorPage.tsx` into `client/src/features/subscriptions/pages/` along with test suites. Re-export from `client/src/pages/PlansPage/index.ts` and `client/src/pages/PlanEditorPage/index.ts`.
**Acceptance criteria:**
- [x] `PlansPage.tsx` and `PlanEditorPage.tsx` consume colocated components and hooks cleanly.
- [x] Vitest test suites pass in `client/src/features/subscriptions/pages/`.
- [x] Legacy page entry points re-export from `@/features/subscriptions`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/subscriptions`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: verify admin plan editing and client plan selection views
**Dependencies:** Task 32, Task 33  
**Files touched:**
- `client/src/features/subscriptions/pages/PlansPage.tsx`
- `client/src/features/subscriptions/pages/PlanEditorPage.tsx`
- `client/src/features/subscriptions/pages/PlansPage.test.tsx`
- `client/src/pages/PlansPage/index.ts`
**Estimated scope:** Medium (4 files)

---

### Task 35: Wire `client/src/features/subscriptions/index.ts` Public Gateway & Update Route Imports
**Description:** Expose authorized public exports in `client/src/features/subscriptions/index.ts` (`PlansPage`, `PlanEditorPage`, `CheckoutSheet`, hooks, types). Update route imports in `client/src/protected-routes.tsx` and `client/src/routes/`.
**Acceptance criteria:**
- [x] Public gateway exposes feature capabilities cleanly.
- [x] Route files import from `@/features/subscriptions`.
- [x] Zero deep imports into `@/features/subscriptions/*`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run lint && npm -w client run build`
- [x] Manual check: route to `/plans` renders cleanly
**Dependencies:** Task 34  
**Files touched:**
- `client/src/features/subscriptions/index.ts`
- `client/src/protected-routes.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 9: Subscriptions Module Migration Cleared
- [x] `client/src/features/subscriptions` contains complete 7-part vertical slice.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes (`npm -w client run lint`).
- [x] Client builds cleanly (`npm -w client run build`).
- [x] All subscription unit and integration tests pass (`npm -w client run test:run`).

---

## Milestone 10: Deprecate & Remove Legacy ADR-002 Shims

### Task 36: Rewire Feature Internals & Remove Circular Dependencies
**Description:** Fix circular and deprecated legacy imports within feature directories (`features/equipment` and `features/subscriptions`). Replace `@/hooks/queries/useSubscriptions` with `@/features/subscriptions` in `useEquipmentQueries.ts` and ensure all feature components/pages import `equipmentService` relatively (`../api/equipmentService`).
**Acceptance criteria:**
- [x] `useEquipmentQueries.ts` imports `SUBSCRIPTION_QUERY_KEYS` from `@/features/subscriptions` and `equipmentService` from `./equipmentService`.
- [x] Equipment components (`DeployAgentModal`, `NextcloudInfoModal`, `AddAdminDeviceModal`, `ActivateWithOtpModal`, `DevicesPage.tsx`) import `equipmentService` relatively.
- [x] Zero circular imports between `features/equipment` and `services/equipmentService`.
**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/features/equipment src/features/subscriptions`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** None  
**Files touched:**
- `client/src/features/equipment/api/useEquipmentQueries.ts`
- `client/src/features/equipment/components/DeployAgentModal.tsx`
- `client/src/features/equipment/components/NextcloudInfoModal.tsx`
- `client/src/features/equipment/components/AddAdminDeviceModal.tsx`
- `client/src/features/equipment/components/ActivateWithOtpModal.tsx`
- `client/src/features/equipment/pages/DevicesPage.tsx`
**Estimated scope:** Medium (6 files)

---

### Task 37: Rewire Stores, Utils & Cross-Domain Services
**Description:** Update Zustand stores, utilities, and services importing from deprecated shims (`@/services/planService`, `@/services/subscriptionService`) to import from canonical feature gateways (`@/features/subscriptions`) or `@shared/contracts`.
**Acceptance criteria:**
- [x] `useSubscriptionStore.ts`, `usePlanStore.ts`, `useCheckoutStore.ts`, and `useCRMStore.ts` import from `@/features/subscriptions` or `@shared/contracts`.
- [x] `planCostCalculator.ts` and its test import `PlanFeature` from `@shared/contracts` or `@/features/subscriptions`.
- [x] `crmService.ts` imports `Plan` / `PlanFeature` from `@shared/contracts`.
**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/utils/ src/store/`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 36  
**Files touched:**
- `client/src/store/useSubscriptionStore.ts`
- `client/src/store/usePlanStore.ts`
- `client/src/store/useCheckoutStore.ts`
- `client/src/store/useCRMStore.ts`
- `client/src/utils/planCostCalculator.ts`
- `client/src/utils/planCostCalculator.test.ts`
- `client/src/services/crmService.ts`
**Estimated scope:** Medium (7 files)

---

### Task 38: Rewire Page Components & Shared UI Call Sites
**Description:** Update legacy page components, hooks, and shared components importing from `@/services/equipmentService`, `@/services/planService`, or `@/hooks/useSLATimer` to import from `@/features/equipment`, `@/features/subscriptions`, or `@/features/tickets`.
**Acceptance criteria:**
- [x] `TechDashboardPage.tsx` imports `useSLATimer` from `@/features/tickets`.
- [x] `components/devices/*`, `components/maintenance/*`, `hooks/useMaintenance.ts`, `hooks/useRmmDashboard.ts`, and `hooks/useClientDashboard.ts` import from `@/features/equipment` or `@shared/contracts`.
- [x] `CRMNewLeadModal.tsx` imports from `@/features/subscriptions` or `@shared/contracts`.
**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/components/ src/pages/`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 36, Task 37  
**Files touched:**
- `client/src/pages/TechDashboardPage/TechDashboardPage.tsx`
- `client/src/pages/CRMPage/components/CRMNewLeadModal.tsx`
- `client/src/hooks/useClientDashboard.ts`
- `client/src/hooks/useMaintenance.ts`
- `client/src/hooks/useRmmDashboard.ts`
- `client/src/components/devices/RmmDeviceTable.tsx`
- `client/src/components/devices/DeployAgentModal.tsx`
- `client/src/components/devices/AddAdminDeviceModal.tsx`
- `client/src/components/devices/ActivateWithOtpModal.tsx`
- `client/src/components/maintenance/ScheduleMaintenanceModal.tsx`
**Estimated scope:** Medium (10 files)

---

### Task 39: Rewire Integration Test Suites & Mocks
**Description:** Update test mocks and imports in `public-routes.test.tsx`, `ResourcesPage.test.tsx`, `DevicesPage.test.tsx`, and `PlansPage.test.tsx` to reference `@/features/*` instead of deprecated `@/services/*` or `@/hooks/queries/*`.
**Acceptance criteria:**
- [x] `public-routes.test.tsx` mocks `@/features/subscriptions` and `@/features/tickets`.
- [x] `ResourcesPage.test.tsx` imports and mocks `@/features/subscriptions`.
- [x] `DevicesPage.test.tsx` and `PlansPage.test.tsx` mock feature gateways cleanly.
**Verification:**
- [x] Tests pass: `npm -w client run test:run`
**Dependencies:** Task 38  
**Files touched:**
- `client/src/public-routes.test.tsx`
- `client/src/pages/ResourcesPage/ResourcesPage.test.tsx`
- `client/src/features/equipment/pages/DevicesPage.test.tsx`
- `client/src/features/subscriptions/pages/PlansPage.test.tsx`
**Estimated scope:** Small (4 files)

---

### Task 40: Delete All 29 Deprecated Compatibility Shims & Legacy Tests
**Description:** Permanently delete all legacy shim files in `hooks/queries/`, `services/`, `hooks/`, and `pages/` that were retained during previous migrations.
**Acceptance criteria:**
- [x] All 6 files in `client/src/hooks/queries/` deleted (`useSubscriptions.ts`, `useSubscriptions.test.tsx`, `useEquipment.ts`, `useEquipment.test.tsx`, `useTickets.ts`, `useTickets.test.tsx`).
- [x] 4 deprecated service files deleted (`planService.ts`, `subscriptionService.ts`, `equipmentService.ts`, `ticketService.ts`).
- [x] 10 deprecated hook files deleted (`useBilling.ts`, `useDevicesPage.ts`, `useDeviceFilters.ts`, `useDeviceModals.ts`, `useDeviceQueries.ts`, `usePlansPage.ts`, `useCheckout.ts`, `useSLATimer.ts`, `useTicketDetail.ts`, `useTicketsPage.ts`).
- [x] 23 deprecated page files/components deleted under `client/src/pages/` (`BillingPage/*`, `DevicesPage/*`, `PlanEditorPage/*`, `PlansPage/*`, `TicketDetailPage/*`, `TicketsPage/*`).
- [x] Zero files remain with `* Deprecated per ADR-002` comments.
**Verification:**
- [x] `npm -w client run test:run` passes 100% green.
- [x] `npm -w client run build` compiles with zero errors.
**Dependencies:** Task 36, Task 37, Task 38, Task 39  
**Files touched:**
- 29+ legacy shim and stub files deleted across `client/src/`
**Estimated scope:** Large (29+ files deleted)

---

### Task 41: Fortify ESLint AST Rules & Vitest Architecture Invariants
**Description:** Add ESLint restricted-imports rule banning `@/hooks/queries/**` across the entire codebase. Update `client/tests/arch/feature-architecture.test.ts` to assert that no deprecated compatibility shims exist and that all legacy entry points remain absent.
**Acceptance criteria:**
- [x] `client/eslint.config.js` restricts `@/hooks/queries/**` with an explicit error.
- [x] `client/tests/arch/feature-architecture.test.ts` includes an invariant test for zero legacy shims.
- [x] `npm -w client run lint` and `npm -w client run test:arch` pass 100% green.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Lint succeeds: `npm -w client run lint`
- [x] Build succeeds: `npm -w client run build`
**Dependencies:** Task 40  
**Files touched:**
- `client/eslint.config.js`
- `client/tests/arch/feature-architecture.test.ts`
**Estimated scope:** Small (2 files)

---

## Checkpoint 10: ADR-002 Deprecated Shims Completely Purged & Verified
- [x] All 29+ deprecated shims and legacy test stubs permanently deleted.
- [x] Zero circular imports or deep import violations.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes with 0 errors (`npm -w client run lint`).
- [x] Full client test suite passes 100% (`npm -w client run test:run`).
- [x] Client builds cleanly (`npm -w client run build`).

---

## Milestone 11: Migrate CRM & Lead Pipeline Module to ADR-002 Colocated Architecture (P1)

### Task 42: Scaffold `client/src/features/crm/` & Colocate CRM API Queries
**Description:** Scaffold `client/src/features/crm/` and create `api/useCrmQueries.ts` migrating `client/src/services/crmService.ts`. Define query hooks (`useLeads`, `useDeals`, `useQuotes`) and mutation hooks (`useCreateLead`, `useUpdateDealStage`, `useGenerateQuote`). Define ephemeral UI types in `types.ts`. Re-export from `client/src/services/crmService.ts`.
**Acceptance criteria:**
- [x] `client/src/features/crm/api/useCrmQueries.ts` exports all CRM query and mutation hooks.
- [x] `types.ts` contains ephemeral UI types (Kanban column drag state, filter modes).
- [x] Legacy `client/src/services/crmService.ts` re-exports from `@/features/crm`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: verify CRM deal stage transitions match BL-501
**Dependencies:** None  
**Files touched:**
- `client/src/features/crm/api/useCrmQueries.ts`
- `client/src/features/crm/api/crmService.ts`
- `client/src/features/crm/types.ts`
- `client/src/services/crmService.ts`
**Estimated scope:** Medium (4 files)

---

### Task 43: Colocate CRM Kanban Board, Lead Cards & Custom Plan Modals
**Description:** Colocate CRM presentation components into `client/src/features/crm/components/` (`CrmKanbanBoard.tsx`, `LeadCard.tsx`, `CreateLeadModal.tsx`, `ConvertLeadModal.tsx`, `CustomPlanQuoteModal.tsx`).
**Acceptance criteria:**
- [x] CRM components colocated in `client/src/features/crm/components/`.
- [x] All props use direct contracts from `@shared/contracts`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npx tsc --noEmit -p client/tsconfig.app.json`
- [x] Manual check: test lead drag-and-drop between pipeline stages
**Dependencies:** Task 42  
**Files touched:**
- `client/src/features/crm/components/CRMKanbanBoard.tsx`
- `client/src/features/crm/components/CRMDataTable.tsx`
- `client/src/features/crm/components/CRMNewLeadModal.tsx`
- `client/src/features/crm/components/CRMLeadDetailSheet.tsx`
**Estimated scope:** Medium (4 files)

---

### Task 44: Colocate CRM Filter & Pipeline Hooks
**Description:** Colocate `useCrmFilters.ts` and `useCrmModals.ts` into `client/src/features/crm/hooks/`. Synchronize pipeline stage filter, search query, and deal view mode (`?view=kanban|table`) via `useUrlState`.
**Acceptance criteria:**
- [x] CRM hooks live in `client/src/features/crm/hooks/`.
- [x] URL state preserves active view and filters across browser reloads.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test switching between table and kanban view
**Dependencies:** Task 42, Task 43  
**Files touched:**
- `client/src/features/crm/hooks/useCrmFilters.ts`
- `client/src/features/crm/hooks/useCrmModals.ts`
**Estimated scope:** Small (2 files)

---

### Task 45: Colocate `CRMPage` & `CRMCustomPlanPage` with Vitest Tests into `client/src/features/crm/pages/`
**Description:** Colocate `CRMPage.tsx` and `CRMCustomPlanPage.tsx` into `client/src/features/crm/pages/` along with test suites. Re-export from `client/src/pages/CRMPage/index.ts` and `client/src/pages/CRMCustomPlanPage/index.ts`.
**Acceptance criteria:**
- [x] Pages consume colocated components and hooks cleanly.
- [x] Vitest test suites execute and pass.
- [x] Legacy page entry points re-export from `@/features/crm`.
**Verification:**
- [x] Tests pass: `npx vitest run client/src/features/crm`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test custom plan quote provisioning flow
**Dependencies:** Task 43, Task 44  
**Files touched:**
- `client/src/features/crm/pages/CRMPage.tsx`
- `client/src/features/crm/pages/CRMCustomPlanPage.tsx`
- `client/src/features/crm/pages/CRMPage.test.tsx`
**Estimated scope:** Medium (4 files)

---

### Task 46: Wire `client/src/features/crm/index.ts` Public Gateway & Update Route Imports
**Description:** Expose authorized public exports in `client/src/features/crm/index.ts` (`CRMPage`, `CRMCustomPlanPage`, query hooks, types). Update route definitions in `client/src/protected-routes.tsx` and `client/src/routes/`.
**Acceptance criteria:**
- [x] Public gateway exports all public capabilities cleanly.
- [x] Route files import from `@/features/crm`.
- [x] Zero deep imports into `@/features/crm/*`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run lint && npm -w client run build`
- [x] Manual check: navigation to `/crm` works
**Dependencies:** Task 45  
**Files touched:**
- `client/src/features/crm/index.ts`
- `client/src/routes/_app/crm.tsx`
- `client/src/routes/_app/crm/custom-plans.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 11: CRM Module Migration Cleared
- [x] `client/src/features/crm` contains complete 7-part vertical slice.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes (`npm -w client run lint`).
- [x] Client builds cleanly (`npm -w client run build`).
- [x] All CRM unit and integration tests pass (`npm -w client run test:run`).

--## Milestone 12: Migrate RMM & Maintenance Module to ADR-002 Colocated Architecture (P1)

### Task 47: Scaffold `client/src/features/rmm/` & Colocate RMM/Maintenance API Queries
**Description:** Scaffold `client/src/features/rmm/` and create `api/useRmmQueries.ts` consolidating `maintenanceService.ts` and `rmmService.ts`. Provide query hooks (`useTelemetry`, `usePatchStatus`, `useMaintenanceSchedules`) and mutation hooks (`useTriggerPatch`, `useRestartService`, `useExecuteScript`). Re-export from legacy services.
**Acceptance criteria:**
- [x] `client/src/features/rmm/api/useRmmQueries.ts` exports all RMM query and mutation hooks.
- [x] `types.ts` contains ephemeral UI state (active tab, chart time window).
- [x] Legacy services re-export from `@/features/rmm`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: verify telemetry metrics fetching
**Dependencies:** None  
**Files touched:**
- `client/src/features/rmm/api/useRmmQueries.ts`
- `client/src/features/rmm/api/rmmService.ts`
- `client/src/features/rmm/api/maintenanceService.ts`
- `client/src/features/rmm/types.ts`
**Estimated scope:** Medium (4 files)

---

### Task 48: Colocate Patch Management, Telemetry & Service Modals
**Description:** Move RMM components into `client/src/features/rmm/components/` (`ScheduleMaintenanceModal.tsx`).
**Acceptance criteria:**
- [x] Components colocated in `client/src/features/rmm/components/`.
- [x] All props use `@shared/contracts` schemas directly.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npx tsc --noEmit -p client/tsconfig.app.json`
- [x] Manual check: test opening patch modal and restarting a service
**Dependencies:** Task 47  
**Files touched:**
- `client/src/features/rmm/components/ScheduleMaintenanceModal.tsx`
**Estimated scope:** Medium (2 files)

---

### Task 49: Colocate Maintenance & RMM Dashboard Hooks
**Description:** Colocate `useMaintenance.ts`, `useRmmDashboard.ts`, and `usePatchManagementModal.ts` into `client/src/features/rmm/hooks/`. Synchronize tabs (`?tab=telemetry|patches|schedules`) via `useUrlState`.
**Acceptance criteria:**
- [x] RMM hooks colocated in `client/src/features/rmm/hooks/`.
- [x] URL state preserves tab and device filter parameters.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test live telemetry refresh interval
**Dependencies:** Task 47, Task 48  
**Files touched:**
- `client/src/features/rmm/hooks/useMaintenance.ts`
- `client/src/features/rmm/hooks/useRmmDashboard.ts`
- `client/src/features/rmm/hooks/usePatchManagementModal.ts`
- `client/src/features/rmm/hooks/useRmmFilters.ts`
- `client/src/features/rmm/hooks/useRmmModals.ts`
**Estimated scope:** Small (5 files)

---

### Task 50: Colocate `MaintenancePage` with Vitest Tests into `client/src/features/rmm/pages/`
**Description:** Colocate `MaintenancePage.tsx` into `client/src/features/rmm/pages/`.
**Acceptance criteria:**
- [x] `MaintenancePage.tsx` consumes colocated components and hooks cleanly.
- [x] Client builds cleanly with zero errors.
**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test maintenance overview rendering
**Dependencies:** Task 48, Task 49  
**Files touched:**
- `client/src/features/rmm/pages/MaintenancePage.tsx`
**Estimated scope:** Small (2 files)

---

### Task 51: Wire `client/src/features/rmm/index.ts` Public Gateway & Update Route Imports
**Description:** Expose authorized public exports in `client/src/features/rmm/index.ts` (`MaintenancePage`, query hooks, modals, types). Update route definitions in `client/src/protected-routes.tsx` and `client/src/routes/`.
**Acceptance criteria:**
- [x] Public gateway exports all public capabilities cleanly.
- [x] Route files import from `@/features/rmm`.
- [x] Zero deep imports into `@/features/rmm/*`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run lint && npm -w client run build`
- [x] Manual check: navigation to `/maintenance` and `/rmm` works
**Dependencies:** Task 50  
**Files touched:**
- `client/src/features/rmm/index.ts`
- `client/src/routes/_app/maintenance.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 12: RMM & Maintenance Module Migration Cleared
- [x] `client/src/features/rmm` contains complete 7-part vertical slice.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes (`npm -w client run lint`).
- [x] Client builds cleanly (`npm -w client run build`).
- [x] All RMM unit and integration tests pass (`npm -w client run test:run`).

---

## Milestone 13: Migrate Financial & OpEx Module to ADR-002 Colocated Architecture (P1)

### Task 52: Scaffold `client/src/features/financial/` & Colocate Financial API Queries
**Description:** Scaffold `client/src/features/financial/` and create `api/useFinancialQueries.ts` consolidating `earningsService.ts` and `expenseService.ts`. Provide query hooks (`useEarningsStats`, `useTechnicianBounties`, `useExpenses`) and mutation hooks (`useLogExpense`, `useApproveCommissionPayout`). Re-export from legacy services.
**Acceptance criteria:**
- [x] `client/src/features/financial/api/useFinancialQueries.ts` exports all financial queries and mutations.
- [x] `types.ts` contains ephemeral UI state (date range selector, split tab).
- [x] Legacy services re-export from `@/features/financial`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: verify 70/30 net profit calculation matches BL-802
**Dependencies:** None  
**Files touched:**
- `client/src/features/financial/api/useFinancialQueries.ts`
- `client/src/features/financial/api/earningsService.ts`
- `client/src/features/financial/api/expenseService.ts`
- `client/src/features/financial/types.ts`
**Estimated scope:** Medium (4 files)

---

### Task 53: Colocate Profit Split, Commission & Expense Modals
**Description:** Move financial components from `client/src/components/financial/` into `client/src/features/financial/components/` (`ExpenseDoughnut.tsx`, `KpiCards.tsx`, `LogExpenseDialog.tsx`, `RevenueChart.tsx`, `TechnicianPayrollTable.tsx`, `TransactionsTable.tsx`).
**Acceptance criteria:**
- [x] Components colocated in `client/src/features/financial/components/`.
- [x] All props use direct contracts from `@shared/contracts`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npx tsc --noEmit -p client/tsconfig.app.json`
- [x] Manual check: test logging a pre-split OpEx expense
**Dependencies:** Task 52  
**Files touched:**
- `client/src/features/financial/components/ExpenseDoughnut.tsx`
- `client/src/features/financial/components/KpiCards.tsx`
- `client/src/features/financial/components/LogExpenseDialog.tsx`
- `client/src/features/financial/components/RevenueChart.tsx`
- `client/src/features/financial/components/TechnicianPayrollTable.tsx`
- `client/src/features/financial/components/TransactionsTable.tsx`
**Estimated scope:** Medium (6 files)

---

### Task 54: Colocate Financial Dashboard Hooks
**Description:** Colocate `useFinancialDashboard.ts` and date filter hooks into `client/src/features/financial/hooks/`. Synchronize period filters (`?from=...&to=...`) via `useUrlState`.
**Acceptance criteria:**
- [x] `useFinancialDashboard.ts` lives in `client/src/features/financial/hooks/`.
- [x] URL state preserves date range selections.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test date filter changes updating metric summaries
**Dependencies:** Task 52, Task 53  
**Files touched:**
- `client/src/features/financial/hooks/useFinancialDashboard.ts`
- `client/src/features/financial/hooks/useFinancialFilters.ts`
- `client/src/features/financial/hooks/useFinancialModals.ts`
**Estimated scope:** Small (3 files)

---

### Task 55: Colocate `FinancialPage` with Vitest Tests into `client/src/features/financial/pages/`
**Description:** Colocate `FinancialPage.tsx` into `client/src/features/financial/pages/`.
**Acceptance criteria:**
- [x] `FinancialPage.tsx` consumes colocated components and hooks cleanly.
- [x] Client builds cleanly with zero errors.
**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: verify revenue chart rendering
**Dependencies:** Task 53, Task 54  
**Files touched:**
- `client/src/features/financial/pages/FinancialPage.tsx`
**Estimated scope:** Small (2 files)

---

### Task 56: Wire `client/src/features/financial/index.ts` Public Gateway & Update Route Imports
**Description:** Expose authorized public exports in `client/src/features/financial/index.ts` (`FinancialPage`, query hooks, modals, types). Update route definitions in `client/src/protected-routes.tsx` and `client/src/routes/`.
**Acceptance criteria:**
- [x] Public gateway exports all public capabilities cleanly.
- [x] Route files import from `@/features/financial`.
- [x] Zero deep imports into `@/features/financial/*`.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run lint && npm -w client run build`
- [x] Manual check: navigation to `/financial` works
**Dependencies:** Task 55  
**Files touched:**
- `client/src/features/financial/index.ts`
- `client/src/routes/_app/financial.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 13: Financial Module Migration Cleared
- [x] `client/src/features/financial` contains complete 7-part vertical slice.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes (`npm -w client run lint`).
- [x] Client builds cleanly (`npm -w client run build`).
- [x] All financial unit and integration tests pass (`npm -w client run test:run`).

---

## Milestone 14: Migrate Identity, Access & Auth Modules (P1)

### Task 57: Scaffold `client/src/features/users/`, Colocate User Management API & Modals, Wire Gateway & Routes
**Description:** Scaffold `client/src/features/users/` and colocate user queries (`useUsersQueries.ts` migrating `userService.ts`), user table, action menu, filter bar, stats bar (`components/`), `useUserManagement.ts` hook, `UserManagementPage.tsx` (`pages/`), and public gateway `index.ts`.
**Acceptance criteria:**
- [x] `client/src/features/users` contains complete vertical slice.
- [x] `UserManagementPage.tsx` and its tests pass in `features/users/pages/`.
- [x] `index.ts` public gateway wires cleanly with zero deep imports.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test inviting a user and granting JIT role
**Dependencies:** None  
**Files touched:**
- `client/src/features/users/api/useUsersQueries.ts`
- `client/src/features/users/api/userService.ts`
- `client/src/features/users/components/UserActionsMenu.tsx`
- `client/src/features/users/components/UserFiltersBar.tsx`
- `client/src/features/users/components/UserRoleBadge.tsx`
- `client/src/features/users/components/UserStatsBar.tsx`
- `client/src/features/users/hooks/useUserManagement.ts`
- `client/src/features/users/pages/UserManagementPage.tsx`
- `client/src/features/users/types.ts`
- `client/src/features/users/index.ts`
**Estimated scope:** Large (10 files)

---

### Task 58: Scaffold `client/src/features/auth/`, Colocate Auth API, Login/Register Forms, Wire Gateway & Routes
**Description:** Scaffold `client/src/features/auth/` and colocate auth service (`api/useAuthQueries.ts` migrating `authService.ts`), `LoginPage.tsx` and `RegisterPage.tsx` (`pages/`), and public gateway `index.ts`.
**Acceptance criteria:**
- [x] `client/src/features/auth` contains complete vertical slice.
- [x] `LoginPage.tsx` and `RegisterPage.tsx` execute cleanly from `features/auth/pages/`.
- [x] Public gateway exports all auth utilities cleanly.
**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/features/auth`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test login, MFA step-up dialog, and session monitor
**Dependencies:** None  
**Files touched:**
- `client/src/features/auth/api/useAuthQueries.ts`
- `client/src/features/auth/api/authService.ts`
- `client/src/features/auth/api/authService.test.ts`
- `client/src/features/auth/pages/LoginPage.tsx`
- `client/src/features/auth/pages/LoginPage.test.tsx`
- `client/src/features/auth/pages/RegisterPage.tsx`
- `client/src/features/auth/types.ts`
- `client/src/features/auth/index.ts`
**Estimated scope:** Large (8 files)

---

## Checkpoint 14: Identity, Access & Auth Migration Cleared
- [x] `client/src/features/users` and `client/src/features/auth` contain complete vertical slices.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] ESLint passes (`npm -w client run lint`).
- [x] Client builds cleanly (`npm -w client run build`).
- [x] All auth and user unit/integration tests pass (`npm -w client run test:run`).

---

## Milestone 15: Migrate Dashboard, Settings & System Modules & Final Cleanups (P2)

### Task 59: Scaffold & Colocate `client/src/features/dashboard/` (DashboardPage, TechDashboardPage, Widgets)
**Description:** Scaffold `client/src/features/dashboard/` and colocate client & admin dashboard widgets (`ActiveSubscriptions.tsx`, `AdminDashboardView.tsx`, `ClientDashboardView.tsx`, `DashboardSummaryStats.tsx`, `RecentInvoices.tsx`, `StorageQuota.tsx`), hooks (`useClientDashboard.ts`, `useAdminDashboard.ts`), pages (`DashboardPage.tsx`, `TechDashboardPage.tsx`), and public gateway `index.ts`.
**Acceptance criteria:**
- [x] `client/src/features/dashboard` contains complete vertical slice.
- [x] `DashboardPage.tsx` and `TechDashboardPage.tsx` run with tests.
- [x] Public gateway wires cleanly.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test client vs tech dashboard views
**Dependencies:** None  
**Files touched:**
- `client/src/features/dashboard/api/useDashboardQueries.ts`
- `client/src/features/dashboard/components/ActiveSubscriptions.tsx`
- `client/src/features/dashboard/components/AdminDashboardView.tsx`
- `client/src/features/dashboard/components/ClientDashboardView.tsx`
- `client/src/features/dashboard/components/DashboardSummaryStats.tsx`
- `client/src/features/dashboard/components/RecentInvoices.tsx`
- `client/src/features/dashboard/components/StorageQuota.tsx`
- `client/src/features/dashboard/hooks/useClientDashboard.ts`
- `client/src/features/dashboard/hooks/useAdminDashboard.ts`
- `client/src/features/dashboard/pages/DashboardPage.tsx`
- `client/src/features/dashboard/pages/TechDashboardPage.tsx`
- `client/src/features/dashboard/index.ts`
**Estimated scope:** Large (12 files)

---

### Task 60: Scaffold & Colocate `client/src/features/settings/` (ProfilePage, NotificationPreferencesPage, PasswordManagerPage)
**Description:** Scaffold `client/src/features/settings/` and colocate profile editing (`useProfile.ts`), notification preferences (`useNotificationPreferences.ts`, `useNotificationHistory.ts`, `notificationService.ts`, `notificationPreferenceService.ts`), password manager page, and public gateway `index.ts`.
**Acceptance criteria:**
- [x] `client/src/features/settings` contains complete vertical slice.
- [x] Profile, notification preferences, and password manager pages run cleanly.
- [x] Public gateway wires cleanly.
**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/features/settings`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test saving notification channel toggles
**Dependencies:** None  
**Files touched:**
- `client/src/features/settings/api/notificationService.ts`
- `client/src/features/settings/api/notificationPreferenceService.ts`
- `client/src/features/settings/api/useSettingsQueries.ts`
- `client/src/features/settings/hooks/useProfile.ts`
- `client/src/features/settings/hooks/useNotificationPreferences.ts`
- `client/src/features/settings/hooks/useNotificationHistory.ts`
- `client/src/features/settings/pages/ProfilePage.tsx`
- `client/src/features/settings/pages/NotificationPreferencesPage.tsx`
- `client/src/features/settings/pages/PasswordManagerPage.tsx`
- `client/src/features/settings/index.ts`
**Estimated scope:** Large (10 files)

---

### Task 61: Scaffold & Colocate `client/src/features/system/` (ApiStatusPage, System Health)
**Description:** Scaffold `client/src/features/system/` and colocate `useApiStatus.ts`, `systemService.ts`, `ApiStatusPage.tsx`, and public gateway `index.ts`.
**Acceptance criteria:**
- [x] `client/src/features/system` contains complete vertical slice.
- [x] `ApiStatusPage.tsx` runs with tests.
- [x] Public gateway wires cleanly.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch`
- [x] Build succeeds: `npm -w client run build`
- [x] Manual check: test API latency and service health checks
**Dependencies:** None  
**Files touched:**
- `client/src/features/system/api/systemService.ts`
- `client/src/features/system/api/useSystemQueries.ts`
- `client/src/features/system/hooks/useApiStatus.ts`
- `client/src/features/system/pages/ApiStatusPage.tsx`
- `client/src/features/system/index.ts`
**Estimated scope:** Medium (5 files)

---

### Task 62: Deprecate Legacy Horizontal Folders & Run Full Architecture & Monorepo Test Gates
**Description:** Verify all route files and pages import strictly through feature public gateways (`@/features/*`). Verify no lingering deprecated markers or shims exist. Run full monorepo verification (`test:arch`, `lint`, `build`, `test:run`).
**Acceptance criteria:**
- [x] Architecture tests pass 100% across all feature modules (17/17 tests).
- [x] Zero ESLint errors or forbidden AST contract declarations.
- [x] Full monorepo build and test suites execute 100% green.
**Verification:**
- [x] Tests pass: `npm -w client run test:arch && npm -w client run test:run && npm -w server run test`
- [x] Build succeeds: `npm -w client run build && npm -w server run build`
- [x] Manual check: full portal smoke test across all routes
**Dependencies:** Task 59, Task 60, Task 61  
**Files touched:**
- `client/tests/arch/feature-architecture.test.ts`
- Monorepo test suites
**Estimated scope:** Small (2 files)

---

## Checkpoint 15: Monorepo Full ADR-002 Colocated Feature Migration Cleared
- [x] All 9 domain features (`auth`, `billing`, `crm`, `dashboard`, `equipment`, `financial`, `rmm`, `settings`, `subscriptions`, `system`, `tickets`, `users`) contain complete vertical slices.
- [x] Architecture tests pass (`npm -w client run test:arch`).
- [x] Client and Server build cleanly with zero TypeScript errors.
- [x] All client and server test suites pass 100% green.
- [x] All tasks in `tasks/plan.md` and `tasks/todo.md` completed.
