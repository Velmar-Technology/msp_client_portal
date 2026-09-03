# Implementation Plan: SOTA Infrastructure Overhaul & Contract Conformance Engine

## Overview
Decompose and execute the 7-phase SOTA roadmap from [`docs/infrastructure/SOTA_ROADMAP.md`](../docs/infrastructure/SOTA_ROADMAP.md), unifying it with [ADR-001](../docs/decisions/ADR-001-contract-first-monolith-and-tanstack-query.md) (Contract-First Monolith & Pragmatic Services) and [ADR-002](../docs/decisions/ADR-002-frontend-colocated-feature-architecture.md) (Colocated Feature Boundaries). 

Work is ordered **largest-security/integrity-risk first** into 4 sequential milestones:
1. **Milestone 1 — Security & Blast Radius (P0):** Secrets purge and Redis sliding-window brute-force rate limiting.
2. **Milestone 2 — Zero-Trust Tenant Isolation (P0):** Fail-closed PostgreSQL RLS enforced via Gateway `AsyncLocalStorage` with zero-leakage tests.
3. **Milestone 3 — Contract Conformance & Developer Rigor (P1):** Supertest API contract testing against `@shared/contracts`, ADR-002 boundary linting, Drizzle reconciliation, and Vitest coverage floors.
4. **Milestone 4 — Observability & Client Experience (P1/P2):** W3C request correlation to Winston/Datadog, TanStack Query PWA offline persistence, and automated axe-core a11y.

---

## Architecture Decisions & Constraints

- **Balanced Zero-Trust:** RLS fails closed when `app.current_tenant_id` is unset or invalid, but rate limiting gracefully falls back to an in-memory LRU cache if Redis is temporarily unreachable.
- **Gateway ALS Isolation (No Pass-Through Repositories):** Consistent with ADR-001, services query Drizzle directly (`db.query.*`). Tenant session context is set at the Express Gateway via Node `AsyncLocalStorage` and applied to scoped DB transactions (`SET LOCAL app.current_tenant_id`), avoiding invasive repository wrapper refactoring.
- **Contract Conformance as Test Truth:** All Supertest HTTP integration assertions must validate payloads directly against `@shared/contracts` Zod schemas.
- **Automated Invariant Gates:** ADR-002 rules (no cross-feature deep imports, zero duplicate entity declarations) are enforced mechanically by ESLint/CI.
- **Zero Regressions:** Existing server and client unit test suites (127+ files) must remain green throughout all milestones.

---

## Dependency Graph

```
Milestone 1: Security & Blast Radius (P0)
   ├── Task 1: Purge Hardcoded Secrets & Split Compose Basic-Auth Hashes (G-01, G-02)
   └── Task 2: Redis Sliding-Window Rate Limiter & Auth Brute-Force Throttling (G-03, G-06)
   └── Checkpoint 1: Security Hardening & Throttling
          │
          ▼
Milestone 2: Tenant Isolation & Zero-Trust RLS (P0)
   ├── Task 3: Fail-Closed PostgreSQL RLS Policies & Table Coverage (G-04, G-05)
   ├── Task 4: Gateway AsyncLocalStorage (ALS) Tenant Context Middleware (G-04)
   └── Task 5: Automated Cross-Tenant Leak Test Suite (G-04, G-05)
   └── Checkpoint 2: Tenant Isolation & Leak Immunity
          │
          ▼
Milestone 3: Contract Conformance & Developer Tooling (P1)
   ├── Task 6: Reconcile Drizzle ORM Config & Migration Drift Check in CI (G-09)
   ├── Task 7: Contract-Driven Supertest API Conformance Suite (G-08 / ADR-001)
   ├── Task 8: Architecture Boundary Invariant CI Lint Rules (ADR-002)
   └── Task 9: Vitest Coverage Gates & Server Build Memory Tuning (G-08, G-11)
   └── Checkpoint 3: Contract Conformance & CI Quality Gates
          │
          ▼
Milestone 4: Observability & Client Experience (P1/P2)
   ├── Task 10: Request-ID & W3C Trace Propagation to Winston & Datadog (G-07)
   ├── Task 11: PWA Offline Shell via TanStack Query `persistQueryClient` (G-10 / ADR-001)
   └── Task 12: Automated axe-core Accessibility Suite in CI (G-10)
   └── Checkpoint 4: SOTA Definition of Done Cleared
```

---

## Task List Index

Detailed tasks with full acceptance criteria and file lists are recorded in [`tasks/todo.md`](./todo.md).

### Milestone 1: Security & Blast Radius
- [x] Task 1: Purge Hardcoded Secrets & Split Compose Basic-Auth Hashes
- [x] Task 2: Implement Redis Sliding-Window & Auth Brute-Force Rate Limiter
- [x] Checkpoint 1: Security Hardening & Throttling

### Milestone 2: Zero-Trust Tenant Isolation
- [x] Task 3: Update SQL RLS Policies to Fail Closed & Cover Missing Tables
- [x] Task 4: Wire Gateway `AsyncLocalStorage` Tenant Context Middleware
- [x] Task 5: Implement Automated Cross-Tenant Leak Test Suite
- [x] Checkpoint 2: Tenant Isolation & Leak Immunity

### Milestone 3: Contract Conformance & Developer Tooling
- [x] Task 6: Reconcile Drizzle Config & Add CI Migration Drift Check
- [x] Task 7: Build Supertest API Integration Suite Using `@shared/contracts`
- [x] Task 8: Implement ADR-002 Boundary & Entity Invariant Lint Rules
- [x] Task 9: Configure Vitest Coverage Gates & Optimize Server Build Memory
- [x] Checkpoint 3: Contract Conformance & CI Quality Gates

### Milestone 4: Observability & Client Experience
- [x] Task 10: Propagate Request-ID & W3C Trace Context to Winston & Datadog
- [x] Task 11: Implement PWA Offline Shell with TanStack Query Cache Persistence
- [x] Task 12: Configure Automated axe-core Accessibility Suite in CI
- [x] Checkpoint 4: SOTA Definition of Done Cleared

### Milestone 5: ADR-002 Feature Architecture Enforcement & Scaffolding Engine
- [x] Task 13: Fortify ESLint Flat Config AST Rules for ADR-002 Invariants (`client/eslint.config.js`)
- [x] Task 14: Automated Architecture Test Suite in Vitest (`client/tests/arch/feature-architecture.test.ts`)
- [x] Task 15: Canonical Feature Scaffolding Engine (`client/scripts/gen-feature.mjs`)
- [x] Task 16: Canonical Feature Slice Recipe & Documentation Update (`docs/architecture/feature-slice-recipe.md`)
- [x] Checkpoint 5: ADR-002 Enforcement & Scaffolding Engine Cleared

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **PostgreSQL Connection Pool Session Leak:** `SET LOCAL app.current_tenant_id` could leak across pooled connections if run outside an explicit transaction block. | High | Scope every tenant query inside a transaction (`db.transaction(async tx => ...)`), or execute an explicit session variable reset on connection release. |
| **Breaking Existing Public/Admin Routes:** Switching RLS to fail closed could break unauthenticated or system-level endpoints (healthchecks, webhooks, auth login). | High | Mark system/public endpoints explicitly (`skipTenantContext: true`) and configure RLS bypass only for trusted system service roles. |
| **Client Hydration Drift with PWA:** Offline cached data colliding with server schema changes. | Medium | Use `persistQueryClient` with versioned cache keys matching package semantic version (`buerokratt_v2.2.0`). |
| **Windows Runner Memory Load:** Running Vitest coverage across full monorepo can cause node heap spikes. | Low | Run separate workspace coverage steps (`npm -w server run test:coverage` then `npm -w client run test:coverage`) with `--max-old-space-size=4096`. |
