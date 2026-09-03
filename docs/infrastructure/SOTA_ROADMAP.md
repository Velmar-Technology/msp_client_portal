# MSP Client Portal — SOTA Roadmap

_Status: Active · Last Verified: 2026-09-03 · Version: 2.0 · Author: Infrastructure Team_

This document captures a State-of-the-Art (SOTA) gap assessment of the `msp_client_portal` PERN stack (PostgreSQL 16, Express 5, React 19, Node 22) and a phased remediation plan ordering work **largest-security/integrity-risk first**. It integrates the standards established in [ADR-001](../decisions/ADR-001-contract-first-monolith-and-tanstack-query.md) (Contract-First Monolith & Pragmatic Services) and [ADR-002](../decisions/ADR-002-frontend-colocated-feature-architecture.md) (Frontend Colocated Features).

Active execution tasks and verification checkpoints are tracked in [`tasks/plan.md`](../../tasks/plan.md) and [`tasks/todo.md`](../../tasks/todo.md).

> **Note:** Security findings are described by area and evidence path. Live secret **values** are not reproduced here; they must not be committed to source or shared in issue channels.

---

## 1. Executive Summary

The stack is already **~80% SOTA** across architecture, delivery, and observability:

- **Contract-first modular monolith** (`@shared/contracts` + Zod, TanStack Query, strict Clean Architecture, ADR-001 / ADR-002).
- **Enterprise CI/CD** — GitHub Actions quality gates (lint/typecheck/tests), Trivy `HIGH/CRITICAL` vulnerability gate + SARIF, SBOM/provenance images, GHCR push, and a Portainer deploy with automatic rollback.
- **Observability** — Winston structured logs, Datadog APM + RUM, Grafana Faro, Prometheus metrics, Zabbix monitoring.
- **Infra** — Traefik TLS, Vaultwarden, resource limits + healthchecks on every container.
- **Type safety & tests** — Zero-`any` builds, 127+ test files across server/client/packages.

The remaining gaps cluster into **security hardening**, **tenant-isolation integrity**, and **test/observability rigor**. The most urgent items are **P0** (plaintext secrets and a tenant-isolation mechanism that is not actually enforced).

---

## 2. SOTA Baseline (already in place)

| Dimension | What exists | Evidence |
| :--- | :--- | :--- |
| Architecture | Contract-first monolith, Clean Architecture, ADR-001/002, feature colocation | `docs/decisions/ADR-001-*`, `ADR-002-*`; `packages/*` |
| Frontend data | TanStack Query (server state), Zustand (UI state only), i18n, code-splitting | `client/src/hooks/`, `client/src/features/*` |
| Security scanning | Trivy `HIGH/CRITICAL` gate + SARIF + SBOM/provenance | `.github/workflows/deploy.yml` |
| CI/CD | Quality gates → build → scan → Portainer deploy w/ auto-rollback, env approval | `.github/workflows/ci.yml`, `quality.yml`, `deploy.yml` |
| Observability | Winston JSON logs, dd-trace APM, Faro RUM, Prometheus | `server/src/tracer.ts`, `shared/metrics`, `client/src/telemetry/` |
| Infra | Traefik TLS/LE, Zabbix, Vaultwarden, resource limits, healthchecks | `docs/infrastructure/MSP_PORTAL_STACK.md` |
| Testing | 127+ unit/component test files (server + client + packages) | server/client/packages `*.test.ts` |

---

## 3. Gap Inventory

Ordered **largest-risk first**. Each gap lists current state, the gap, and evidence.

### P0 — Security

| ID | Area | Current state | Gap | Evidence |
| :-- | :-- | :-- | :-- | :-- |
| **G-01** | Compose secrets | `docker-compose.prod.yml` contains a hardcoded `GF_SECURITY_ADMIN_PASSWORD` fallback and a **shared** bcrypt basic-auth hash reused by Zabbix, Dozzle and Prometheus. | Live admin secrets and a shared credential are committed to source; a single hash compromise exposes three dashboards. Rotate to distinct per-app hashes; require secrets from the Portainer env (no inline fallback). | `docker-compose.prod.yml:224, 313, 371, 427`; `MSP_PORTAL_STACK.md §8` (explicitly flags the shared hash) |
| **G-02** | Legacy dev compose | Root `docker-compose.yml` embeds plaintext JWT/PayPal/DB secrets. | Dev secrets checked into source. Prefer `.env`-driven values or remove; never commit real keys. | `docker-compose.yml` |
| **G-03** | Auth brute-force | No per-IP / per-account limit on `/auth` (login, OTP). | No brute-force or credential-stuffing protection. | `server/src/modules/auth/routes/auth.routes.ts` (no throttling) |

### P0 — Tenant isolation integrity

| ID | Area | Current state | Gap | Evidence |
| :-- | :-- | :-- | :-- | :-- |
| **G-04** | RLS enforcement | `withTenantContext` wrapper exists and is unit-tested but is **never called** in production; RLS policy **returns all rows when `app.current_tenant_id` is unset or `''`/`'ALL'`**. | Tenant isolation relies solely on manual `tenant_id` filters; the session var is never set, so queries outside a tenant-wrapped transaction are not RLS-scoped. A single missed filter ⇒ cross-tenant leak. | `server/src/shared/db/tenantContext.ts` (dead code); `migrations/029_enable_row_level_security.sql:23-46` |
| **G-05** | RLS coverage | `tenants`, `plans`, `round_robin_state` are absent from the tenant policy. | These tables are not RLS-protected. | `migrations/029_enable_row_level_security.sql` |

### P0 — Reported behavior divergence

| ID | Area | Current state | Gap | Evidence |
| :-- | :-- | :-- | :-- | :-- |
| **G-06** | Rate limiter | A gateway limiter is wired globally but is an **in-memory fixed-window `Map`**, not the documented Redis sliding-window. Not distributed, not atomic (check-then-increment race), unbounded store. | Behavior diverges from the documented/AGENTS.md contract ("sliding-window multi-tenant rate limits 1000 req/15m"). | `server/src/shared/middleware/gatewayRateLimiterMiddleware.ts:24, 52-77` |

### P1 — Observability

| ID | Area | Current state | Gap | Evidence |
| :-- | :-- | :-- | :-- | :-- |
| **G-07** | Log correlation | No request-ID assigned/propagated; no log shipping to Datadog/remote (only console + local files). | Traces/logs can't be joined across a request; remote debugging isn't possible from shipped logs. | `server/src/shared/utils/logger.ts`; no request-id middleware in `server/src` |

### P1 — Testing rigor

| ID | Area | Current state | Gap | Evidence |
| :-- | :-- | :-- | :-- | :-- |
| **G-08** | E2E / integration / coverage | Only unit + component tests (Vitest/jsdom). No Playwright/Cypress, no supertest HTTP integration, no coverage reporting. | No end-to-end path verification, no contract/API conformance over HTTP, and no enforced coverage floor. | `client/package.json`, `server/package.json` (no e2e/coverage scripts) |

### P1 — Database tooling

| ID | Area | Current state | Gap | Evidence |
| :-- | :-- | :-- | :-- | :-- |
| **G-09** | Drizzle migrations | `drizzle.config.ts` points at nonexistent paths; snapshot is stale (13 vs 24 tables) and only covers hand-written SQL; no `drizzle-kit`/migration step in CI. | Migration drift and no CI migration verification. | `server/drizzle.config.ts`; `server/src/shared/db/migrations/meta/` |

### P2 — Client & build infra

| ID | Area | Current state | Gap | Evidence |
| :-- | :-- | :-- | :-- | :-- |
| **G-10** | Client SOTA | No PWA/offline, no automated a11y tooling. | No offline resilience, no axe/pa11y automation. | `client/src` (no service worker/manifest; no a11y tooling) |
| **G-11** | Build memory | Server full `tsc` build exhausts heap (OOM at default and even with `--max-old-space-size` under sustained load on constrained hosts). | Build-time instability on memory-limited runners. | `server` build scripts / CI `quality.yml` (heap env var already present) |

---

## 4. Phased Remediation Plan (Consolidated Milestones)

Work is ordered **largest-risk first** into 4 sequential milestones. Each milestone aligns directly with [ADR-001](../decisions/ADR-001-contract-first-monolith-and-tanstack-query.md) (Contract-First Monolith & Pragmatic Services) and [ADR-002](../decisions/ADR-002-frontend-colocated-feature-architecture.md) (Colocated Feature Boundaries). Detailed task items are tracked in [`tasks/todo.md`](../../tasks/todo.md).

### Milestone 1 — Security & Blast Radius (P0)

**Goals:** Remove committed secrets; stop shared credentials; add auth brute-force throttling and atomic sliding-window rate limiting (`G-01`, `G-02`, `G-03`, `G-06`).

- **G-01 & G-02 (Secrets Purge):**
  - Remove hardcoded `GF_SECURITY_ADMIN_PASSWORD` inline fallback in `docker-compose.prod.yml`; mandate environment injection.
  - Split shared bcrypt basic-auth hash into distinct per-app hashes for `zabbix-auth`, `logs-auth`, and `prom-auth`.
  - Replace dev compose plaintext secrets with environment variable placeholders.
- **G-03 & G-06 (Redis Sliding-Window & Brute-Force Rate Limiting):**
  - Replace in-memory `Map` limiter in `gatewayRateLimiterMiddleware.ts` with Redis-backed atomic sliding-window algorithm (`1000 req/15m`).
  - Add dedicated per-IP and per-account brute-force rate limiting to `/auth` routes (`login`, `otp/send`, `otp/verify`).
  - Implement automatic graceful fallback to an in-memory LRU cache if Redis experiences transient downtime.

**Files:** `docker-compose.prod.yml`, `docker-compose.yml`, `server/src/shared/middleware/gatewayRateLimiterMiddleware.ts`, `server/src/modules/auth/middleware/authRateLimiterMiddleware.ts`, `server/src/modules/auth/routes/auth.routes.ts`.

**Verification/DoD:** Zero committed plaintext passwords (grep gate); `npx vitest run src/shared/middleware/ src/modules/auth/` green; `npm -w server run build` clean.

---

### Milestone 2 — Zero-Trust Tenant Isolation (P0)

**Goals:** Enforce database-level fail-closed RLS without pass-through repository boilerplate (`G-04`, `G-05`).

- **G-04 (Fail-Closed RLS via Gateway Context):**
  - In alignment with ADR-001, services query Drizzle directly (`db.query.*`). RLS is established at the Express Gateway via `AsyncLocalStorage` (ALS) connection scoping running `SET LOCAL app.current_tenant_id = :tenantId`.
  - Update `029_enable_row_level_security.sql` to **fail closed**: unauthenticated or unset tenant queries return 0 rows.
  - Public routes (`/health`, `/auth/login`, webhooks) explicitly bypass tenant context via `skipTenantContext: true`.
- **G-05 (Table Coverage & Leak Immunity):**
  - Add explicit RLS policies and `FORCE ROW LEVEL SECURITY` to `tenants`, `plans`, and `round_robin_state`.
  - Create automated cross-tenant leak test suite (`server/src/shared/db/tenantLeak.spec.ts`) proving Tenant A cannot access Tenant B records.

**Files:** `server/src/shared/db/migrations/031_fail_closed_rls.sql`, `server/src/shared/middleware/gatewayTenantContextMiddleware.ts`, `server/src/shared/db/tenantContext.ts`, `server/src/shared/db/tenantLeak.spec.ts`.

**Verification/DoD:** Cross-tenant leak tests pass green; `npm -w server run test` passes without regression; unauthenticated direct queries in psql return 0 rows.

---

### Milestone 3 — Contract Conformance & Developer Rigor (P1)

**Goals:** Validate API routes over HTTP against `@shared/contracts`, enforce ADR-002 boundary rules, and eliminate database schema drift (`G-08`, `G-09`, `G-11`).

- **G-09 (Drizzle Migration Reconciliation):**
  - Fix `server/drizzle.config.ts` pathing; reconcile the 24-table migration meta snapshot; add a CI schema drift check.
- **G-08 (Supertest Contract Conformance):**
  - Add HTTP integration suite validating live Express responses directly against canonical Zod schemas in `@shared/contracts` (ADR-001).
- **ADR-002 Invariant Boundary Gates:**
  - Add ESLint rules enforcing zero cross-feature deep imports and banning duplicate entity interfaces in `client/src/features/*/types.ts`.
- **G-11 (Coverage & Build Memory):**
  - Configure `@vitest/coverage-v8` with a 70% threshold gate; optimize server `tsc` heap limits (`--max-old-space-size=4096`).

**Files:** `server/drizzle.config.ts`, `server/tests/integration/contractConformance.test.ts`, `client/eslint.config.js`, `server/vitest.config.ts`, `.github/workflows/quality.yml`.

**Verification/DoD:** CI migration check clean; Supertest contract suite green; ADR-002 boundary linting passes with zero errors; coverage thresholds met.

---

### Milestone 4 — Observability & Client Experience (P1/P2)

**Goals:** Correlate request lifecycle to Winston/Datadog; deliver PWA offline resilience; automate accessibility (`G-07`, `G-10`).

- **G-07 (Request ID & W3C Trace Correlation):**
  - Add `requestIdMiddleware.ts` propagating `X-Request-Id` and W3C `traceparent` through Winston JSON logs and Datadog APM spans.
- **G-10 (PWA Offline Shell via TanStack Query):**
  - Add web manifest and service worker caching the application shell.
  - Persist TanStack Query cache reads offline using `persistQueryClient` with versioned cache keys (`buerokratt_v2.2.0`).
- **Automated Accessibility Testing:**
  - Introduce `axe-core` accessibility test suite asserting WCAG 2.1 AA compliance across core tables, modals, and navigation.

**Files:** `server/src/shared/middleware/requestIdMiddleware.ts`, `server/src/shared/utils/logger.ts`, `client/public/manifest.webmanifest`, `client/src/main.tsx`, `client/tests/a11y/accessibility.test.ts`.

**Verification/DoD:** End-to-end request-ID visible in structured logs; client builds with PWA manifest; a11y tests green in CI.

---

## 5. Definition of SOTA — Acceptance Checklist

- [ ] Zero committed plaintext secrets; all credentials injected via environment/secret manager.
- [ ] Distinct credentials per service (no shared dashboard auth).
- [ ] Redis sliding-window global limiter + `/auth` brute-force protection active with in-memory LRU fallback.
- [ ] PostgreSQL RLS fails closed; ALS gateway sets `SET LOCAL app.current_tenant_id`; automated cross-tenant leak tests pass.
- [ ] Express endpoints conform to `@shared/contracts` Zod schemas verified via Supertest integration tests (ADR-001).
- [ ] ADR-002 boundaries enforced via CI linting (no cross-feature deep imports, zero duplicate entity declarations).
- [ ] `drizzle-kit` snapshot covers all 24 tables; CI migration drift check passes.
- [ ] Vitest coverage floors enforced in CI; server build memory optimized.
- [ ] Request-ID and W3C trace context threaded through Winston JSON logs and APM spans.
- [ ] PWA offline shell operational with TanStack Query cache persistence.
- [ ] Automated `axe-core` accessibility audit passes WCAG 2.1 AA in CI.

---

## 6. Architectural Decisions & Resolutions

1. **Tenant Context & RLS Strategy:** **Balanced Zero-Trust (Fail Closed).** RLS queries without a valid tenant context return 0 rows. Express Gateway binds context via `AsyncLocalStorage` and opens a scoped transaction setting `SET LOCAL app.current_tenant_id`, preserving ADR-001's pragmatic service layer (`db.query.*`).
2. **Rate Limiting Resilience:** **Graceful LRU Fallback.** Redis sliding-window is authoritative; if Redis is down, in-memory LRU handles throttling without service disruption.
3. **API Testing Standard:** **Contract-First Conformance.** Supertest tests validate HTTP responses directly against `@shared/contracts` Zod schemas, eradicating contract drift.
4. **PWA Scope:** **Offline App Shell & Query Persistence.** Cache the static shell and persist read queries via TanStack Query `persistQueryClient`. Complex bidirectional write-sync is rejected as unnecessary.

---

## 7. Appendix — Evidence Index

| Gap | Evidence file : line |
| :-- | :-- |
| G-01 | `docker-compose.prod.yml:224,313,371,427`; `docs/infrastructure/MSP_PORTAL_STACK.md §8` |
| G-02 | `docker-compose.yml` (plaintext dev secrets) |
| G-03 | `server/src/modules/auth/routes/auth.routes.ts` (no throttling) |
| G-04 | `server/src/shared/db/tenantContext.ts` (dead code); `server/src/shared/db/migrations/029_enable_row_level_security.sql:23-46` |
| G-05 | `server/src/shared/db/migrations/029_enable_row_level_security.sql` (missing tables) |
| G-06 | `server/src/shared/middleware/gatewayRateLimiterMiddleware.ts:24,52-77` |
| G-07 | `server/src/shared/utils/logger.ts`; no request-id middleware in `server/src` |
| G-08 | `client/package.json`, `server/package.json` (no e2e/coverage) |
| G-09 | `server/drizzle.config.ts`; `server/src/shared/db/migrations/meta/` (stale snapshot) |
| G-10 | `client/src` (no service worker/manifest; no a11y tooling) |
| G-11 | `server` build scripts; `.github/workflows/quality.yml` (heap env) |

---

_Review cycle: Quarterly. Re-verify baseline numbers before each phase; keep CONSTRAINTS.md's quality bar intact._
