# Enterprise PERN SaaS Best Practices Blueprint

## Problem Statement
How might we establish enterprise-grade, battle-tested SaaS primitives and end-to-end type safety in our PERN-stack MSP portal, so we can ship core features rapidly without constantly rewriting data access, multi-tenancy, and API layer glue?

## Recommended Direction: The "Linear-Style" Contract-First Monolith

We recommend adopting the pattern favored by modern high-velocity SaaS engineering teams (Linear, Supabase, Resend):

1. **Single Contract Truth with `drizzle-zod` & Contract-First API:**
   - Derive input/output schemas directly from database tables using `drizzle-zod` (`createInsertSchema`, `createSelectSchema`), eliminating duplicate DTO definitions.
   - Define API contracts in a shared workspace package (`@shared/contracts` using `@ts-rest/core` or type-safe RPC contracts). Express routes implement the contract type, and React consumes it with end-to-end autocomplete and zero manual `fetch` boilerplate.

2. **Server Cache Delegation with TanStack Query:**
   - Restrict **Zustand** strictly to local client UI state (active modal, sidebar collapse, theme preference).
   - Use **TanStack Query** for all server state (tickets, equipment, invoices). This eliminates manual loading flags, error handling, manual cache invalidation, and custom polling loops.

3. **Pragmatic Service Layer (Ditch Passthrough Repositories):**
   - Repositories should only exist for non-trivial queries (complex CTEs, window functions, raw analytical aggregations).
   - Simple CRUD and relational lookups can be called via Drizzle directly in domain services, eliminating empty pass-through files that only add friction.

4. **Context-Driven Multi-Tenancy:**
   - Multi-tenancy (`tenant_id`) enforced via Node.js `AsyncLocalStorage` middleware or Express request context, ensuring tenant isolation is applied consistently rather than manually typed in every single query.

---

## Key Assumptions to Validate
- [ ] **Contract Compatibility:** Validate that `@ts-rest/express` or typed contract routers mount cleanly onto your existing Express 5 app without breaking existing routes.
- [ ] **TanStack Query Velocity:** Verify that migrating one domain (e.g., Tickets list & creation) from manual fetch/Zustand to TanStack Query reduces component line count by $\ge 40\%$.
- [ ] **Drizzle-Zod Schema Generation:** Verify that `drizzle-zod` generates schemas that cleanly satisfy business rules (e.g., NCF validation, SLA rules) without excessive overrides.

---

## MVP Scope (What We Are Doing Now)
- **Shared API Contracts:** Set up `@shared/contracts` for 1 pilot module (`tickets`). Define input Zod schema, output Zod schema, and HTTP status codes.
- **TanStack Query in Client:** Configure `QueryClientProvider` and implement contract-driven hooks for ticket fetching, pagination, and status mutations.
- **Repository Pragmatism:** Stop creating 1-line wrapper repositories for simple CRUD; allow domain services to execute Drizzle queries directly.
- **Canonical Feature Slice Reference:** Provide a single reference slice (`create-ticket`) showcasing the pattern as a standard recipe for all future modules.

---

## Not Doing (and Why)
- **NOT rewriting the entire existing backend at once:** Migrate incrementally starting with the next planned feature or highest-friction module. Existing working routes remain untouched until touched for feature work.
- **NOT moving to Next.js or full-stack meta-frameworks:** Keep the existing Vite + Express 5 separation; changing runtime frameworks introduces massive risk and rework.
- **NOT building a custom microservices or event-sourcing system:** Event sourcing and Kafka/RabbitMQ are premature. Stay with a modular monolith backed by PostgreSQL and Redis.
- **NOT pushing business logic into Postgres triggers/stored procedures:** Keep business logic (commissions, NCF, SLA calculations) in TypeScript domain services for testability with Vitest.

---

## Open Questions
1. **Contract Format:** Standard REST with `@ts-rest` (generating an OpenAPI spec for third-party integrations and webhooks) vs `tRPC` (internal TypeScript-only RPC).
2. **Pilot Domain:** Whether to pilot this on the upcoming module or refactor the highest-friction existing module first.
