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

### Milestone 6: Migrate Billing Module to ADR-002 Colocated Architecture (Slice 2)
- [x] Task 17: Extract Billing Modals & Presentation Components into `client/src/features/billing/components/`
- [x] Task 18: Colocate `useBilling` Hook & Ephemeral Types into `client/src/features/billing/`
- [x] Task 19: Colocate `BillingPage` and Vitest Test into `client/src/features/billing/pages/`
- [x] Task 20: Wire `client/src/features/billing/index.ts` Public Gateway & Update Route Imports
- [x] Checkpoint 6: Billing Module Migration Cleared

### Milestone 7: Migrate Equipment & Devices Module to ADR-002 Colocated Architecture (Slice 4)
- [x] Task 21: Scaffold `client/src/features/equipment/` & Colocate API Queries (`useEquipmentQueries.ts`)
- [x] Task 22: Colocate Equipment & Device Modal Components (`client/src/features/equipment/components/`)
- [x] Task 23: Colocate Device Filter & Modal Hooks (`client/src/features/equipment/hooks/`)
- [x] Task 24: Colocate `DevicesPage` and Vitest Test into `client/src/features/equipment/pages/`
- [x] Task 25: Wire Public Gateway (`client/src/features/equipment/index.ts`) & Update Routes
- [x] Checkpoint 7: Equipment Module Migration Cleared

### Milestone 8: Migrate Tickets Module to ADR-002 Colocated Architecture (P0)
- [x] Task 26: Scaffold `client/src/features/tickets/` & Colocate Ticket API Queries (`useTicketQueries.ts`)
- [x] Task 27: Colocate Ticket Presentation Components, Drawer & Modals (`client/src/features/tickets/components/`)
- [x] Task 28: Colocate Ticket Filters, SLA Timers & Modal Hooks (`client/src/features/tickets/hooks/`)
- [x] Task 29: Colocate `TicketsPage` & `TicketDetailPage` with Vitest Tests into `client/src/features/tickets/pages/`
- [x] Task 30: Wire `client/src/features/tickets/index.ts` Public Gateway & Update Route Imports
- [x] Checkpoint 8: Tickets Module Migration Cleared

### Milestone 9: Migrate Subscriptions & Plans Module to ADR-002 Colocated Architecture (P0)
- [x] Task 31: Scaffold `client/src/features/subscriptions/` & Colocate Subscription/Plan API Queries (`useSubscriptionQueries.ts`)
- [x] Task 32: Colocate Checkout Sheet, Plan Cards & Plan Editor Components (`client/src/features/subscriptions/components/`)
- [x] Task 33: Colocate Plans & Checkout Hooks (`client/src/features/subscriptions/hooks/`)
- [x] Task 34: Colocate `PlansPage` & `PlanEditorPage` with Vitest Tests into `client/src/features/subscriptions/pages/`
- [x] Task 35: Wire `client/src/features/subscriptions/index.ts` Public Gateway & Update Route Imports
- [x] Checkpoint 9: Subscriptions Module Migration Cleared

### Milestone 10: Deprecate & Remove Legacy ADR-002 Shims
- [x] Task 36: Rewire Feature Internals & Remove Circular Dependencies (`features/equipment`, `features/subscriptions`)
- [x] Task 37: Rewire Stores, Utils & Cross-Domain Services (`store/*`, `utils/*`, `services/crmService.ts`)
- [x] Task 38: Rewire Page Components & Shared UI Call Sites (`TechDashboardPage`, `devices/*`, `maintenance/*`)
- [x] Task 39: Rewire Integration Test Suites & Mocks (`public-routes.test.tsx`, `ResourcesPage.test.tsx`)
- [x] Task 40: Delete All 29 Deprecated Compatibility Shims & Legacy Tests (`hooks/queries/*`, `services/*`, `hooks/*`, `pages/*`)
- [x] Task 41: Fortify ESLint AST Rules & Vitest Architecture Invariants (`eslint.config.js`, `feature-architecture.test.ts`)
- [x] Checkpoint 10: ADR-002 Deprecated Shims Completely Purged & Verified

### Milestone 11: Migrate CRM & Lead Pipeline Module to ADR-002 Colocated Architecture (P1)
- [x] Task 42: Scaffold `client/src/features/crm/` & Colocate CRM API Queries (`useCrmQueries.ts`)
- [x] Task 43: Colocate CRM Kanban Board, Lead Cards & Custom Plan Modals (`client/src/features/crm/components/`)
- [x] Task 44: Colocate CRM Filter & Pipeline Hooks (`client/src/features/crm/hooks/`)
- [x] Task 45: Colocate `CRMPage` & `CRMCustomPlanPage` with Vitest Tests into `client/src/features/crm/pages/`
- [x] Task 46: Wire `client/src/features/crm/index.ts` Public Gateway & Update Route Imports
- [x] Checkpoint 11: CRM Module Migration Cleared

### Milestone 12: Migrate RMM & Maintenance Module to ADR-002 Colocated Architecture (P1)
- [x] Task 47: Scaffold `client/src/features/rmm/` & Colocate RMM/Maintenance API Queries (`useRmmQueries.ts`)
- [x] Task 48: Colocate Patch Management, Telemetry & Service Modals (`client/src/features/rmm/components/`)
- [x] Task 49: Colocate Maintenance & RMM Dashboard Hooks (`client/src/features/rmm/hooks/`)
- [x] Task 50: Colocate `MaintenancePage` with Vitest Tests into `client/src/features/rmm/pages/`
- [x] Task 51: Wire `client/src/features/rmm/index.ts` Public Gateway & Update Route Imports
- [x] Checkpoint 12: RMM & Maintenance Module Migration Cleared

### Milestone 13: Migrate Financial & OpEx Module to ADR-002 Colocated Architecture (P1)
- [ ] Task 52: Scaffold `client/src/features/financial/` & Colocate Financial API Queries (`useFinancialQueries.ts`)
- [ ] Task 53: Colocate Profit Split, Commission & Expense Modals (`client/src/features/financial/components/`)
- [ ] Task 54: Colocate Financial Dashboard Hooks (`client/src/features/financial/hooks/`)
- [ ] Task 55: Colocate `FinancialPage` with Vitest Tests into `client/src/features/financial/pages/`
- [ ] Task 56: Wire `client/src/features/financial/index.ts` Public Gateway & Update Route Imports
- [ ] Checkpoint 13: Financial Module Migration Cleared

### Milestone 14: Migrate Identity, Access & Auth Modules (P1)
- [ ] Task 57: Scaffold `client/src/features/users/`, Colocate User Management API & Modals, Wire Gateway & Routes
- [ ] Task 58: Scaffold `client/src/features/auth/`, Colocate Auth API, Login/Register Forms, Wire Gateway & Routes
- [ ] Checkpoint 14: Identity, Access & Auth Migration Cleared

### Milestone 15: Migrate Dashboard, Settings & System Modules & Final Cleanups (P2)
- [ ] Task 59: Scaffold & Colocate `client/src/features/dashboard/` (DashboardPage, TechDashboardPage, Widgets)
- [ ] Task 60: Scaffold & Colocate `client/src/features/settings/` (ProfilePage, NotificationPreferencesPage, PasswordManagerPage)
- [ ] Task 61: Scaffold & Colocate `client/src/features/system/` (ApiStatusPage, System Health)
- [ ] Task 62: Deprecate Legacy Horizontal Folders & Run Full Architecture & Monorepo Test Gates
- [ ] Checkpoint 15: Monorepo Full ADR-002 Colocated Feature Migration Cleared

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **PostgreSQL Connection Pool Session Leak:** `SET LOCAL app.current_tenant_id` could leak across pooled connections if run outside an explicit transaction block. | High | Scope every tenant query inside a transaction (`db.transaction(async tx => ...)`), or execute an explicit session variable reset on connection release. |
| **Breaking Existing Public/Admin Routes:** Switching RLS to fail closed could break unauthenticated or system-level endpoints (healthchecks, webhooks, auth login). | High | Mark system/public endpoints explicitly (`skipTenantContext: true`) and configure RLS bypass only for trusted system service roles. |
| **Client Hydration Drift with PWA:** Offline cached data colliding with server schema changes. | Medium | Use `persistQueryClient` with versioned cache keys matching package semantic version (`buerokratt_v2.2.0`). |
| **Windows Runner Memory Load:** Running Vitest coverage across full monorepo can cause node heap spikes. | Low | Run separate workspace coverage steps (`npm -w server run test:coverage` then `npm -w client run test:coverage`) with `--max-old-space-size=4096`. |
