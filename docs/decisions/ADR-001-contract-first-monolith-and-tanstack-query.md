# ADR-001: Contract-First Monolith Architecture and Server State Delegation with TanStack Query

## Status
Accepted

## Date
2026-09-02

## Context
During initial greenfield development of the `msp_client_portal` on the PERN stack (PostgreSQL, Express 5, React 19, Node.js v22), significant engineering friction and rework were encountered whenever data models or business logic evolved. 

The root cause was identified as the **"Enterprise Layering Trap"**:
1. When adding or modifying a database column, engineers were required to manually synchronize up to 7 disparate files across 2 workspaces:
   - Drizzle ORM schema (`server/src/shared/db/schema/`)
   - DTO validation schemas (`server/src/shared/dtos/`)
   - Repositories that merely wrapped Drizzle queries (`findFirst`, `findMany`) with zero custom SQL
   - Domain services passing objects through
   - Express route controllers unpacking payloads
   - Frontend API client services manually typing return payloads (`client/src/services/`)
   - Frontend state stores or component `useState`/`useEffect` blocks manually managing loading, error, and pagination states
2. If any layer drifted, silent runtime errors occurred rather than compile-time type errors.
3. Managing server data cache inside local component state or Zustand caused duplicate requests, race conditions, missing cache invalidations, and high line-count overhead.

We required an architectural standard adopted by high-velocity SaaS engineering teams (Linear, Supabase, Resend) that enforces end-to-end type safety and eradicates boilerplate without sacrificing Clean Architecture principles.

---

## Decision

We adopt a **Contract-First Monolith** architecture with **Server State Delegation to TanStack Query**:

1. **Single Source of Truth via `@shared/contracts`:**
   - All API contracts (request inputs, query parameters, URL params, and entity responses) are defined in the workspace package `packages/contracts` using Zod.
   - Express routes validate incoming requests directly against these shared Zod schemas (`validate(CreateTicketInputSchema)`).
   - Frontend forms, mutations, and queries import types directly from `@shared/contracts`, guaranteeing that modifying a schema immediately produces TypeScript compiler warnings across the entire stack.

2. **Server State Delegation via TanStack Query:**
   - **Zustand** is strictly confined to client-only UI/session state (e.g., active modal, sidebar collapse state, theme preference).
   - All asynchronous server state (tickets, equipment, billing, CRM) is delegated to **TanStack Query** (`@tanstack/react-query`).
   - Query hooks live in `client/src/hooks/queries/` and encapsulate standardized query keys (`TICKET_QUERY_KEYS.all`, `lists()`, `detail(id)`).
   - Mutations execute `queryClient.invalidateQueries(...)` upon success, ensuring tables and details refresh automatically with zero manual `fetch` calls.

3. **Pragmatic Service Layer (Eliminating Empty Pass-Through Repositories):**
   - For standard CRUD, relations, and straightforward filters, Domain Services are authorized to query Drizzle ORM directly without creating a 1-line pass-through repository class.
   - Dedicated repository classes are reserved exclusively for complex raw SQL, window functions, recursive CTEs, or advanced analytical aggregations.

4. **Canonical 4-Step Vertical Slice Recipe:**
   - All new implementations and refactors must adhere to the documented recipe in [`docs/architecture/feature-slice-recipe.md`](../architecture/feature-slice-recipe.md):
     $$\text{Step 1: Contract (@shared/contracts)} \rightarrow \text{Step 2: Route & Service} \rightarrow \text{Step 3: TanStack Query Hook} \rightarrow \text{Step 4: UI Component}$$

---

## Alternatives Considered

### 1. Maintain Strict 5-Layer Clean Architecture with CLI Scaffolding (Plop.js)
* **Pros:** Preserves existing folder structure without adding new workspace packages.
* **Cons:** Code generators only speed up initial file creation; they do nothing to alleviate the maintenance burden when models evolve. Engineers still have to manually maintain 7 files for every field change.
* **Verdict:** Rejected as a "vitamin" that fails to cure the underlying architectural disease.

### 2. Headless BaaS / Postgres Row-Level Security Direct APIs (Supabase/PostgREST)
* **Pros:** Eliminates the backend API layer almost entirely.
* **Cons:** Incompatible with the portal's domain rules: 1-hour SLA cancellation windows (BL-101), DGII NCF tax voucher sequencing (BL-701), 70/30 net profit commissions (BL-802), and JIT ephemeral access grants (BL-302). These rules belong in testable TypeScript domain logic, not database triggers.
* **Verdict:** Rejected as inappropriate for complex enterprise MSP business rules.

### 3. Full-Stack Meta-Framework Migration (Next.js / Remix)
* **Pros:** Colocated server actions and automated data fetching.
* **Cons:** Migrating from Express 5 + Vite to Next.js represents a high-risk rewrite, disrupts WebSocket telemetry and Zabbix webhook handlers, and is unnecessary when a workspace contract package achieves the same type safety.
* **Verdict:** Rejected to protect project stability and delivery timeline.

---

## Consequences

### Positive
* **Compile-Time Safety:** Changing a database column or contract immediately flags red squigglies across React components and server controllers.
* **Massive Boilerplate Reduction:** Eliminates duplicate manual type declarations in `client/src/services/` and removes 1-line wrapper repositories.
* **Automated Data Lifecycle:** Loading skeletons, error boundaries, caching, pagination, and cache invalidation are handled declaratively by TanStack Query.
* **Predictable Feature Velocity:** New features are implemented vertically in 4 clear steps rather than navigating 7 horizontal directories.

### Negative / Trade-offs
* **Monorepo Build Dependency:** Developers and CI must run `npm run build:packages` before compiling `server` or `client` if contract types change.
* **Discipline Required:** Engineers must resist the temptation to write manual Axios calls or store API responses in Zustand.
