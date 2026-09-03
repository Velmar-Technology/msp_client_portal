# Implementation Plan: Enterprise PERN SaaS Best Practices Blueprint

## Overview
Deconstruct the architectural ceremony and cross-layer rework in the PERN stack by piloting a **Contract-First Monolith** with **TanStack Query** on the `tickets` module. This establishes a single source of truth for API contracts (`@shared/contracts`), delegates asynchronous server caching to TanStack Query (retiring manual Axios/Zustand data sync), and introduces a pragmatic, repeatable vertical slice pattern.

## Architecture Decisions
1. **Shared Workspace Contract Package (`@shared/contracts`):** 
   - Define type-safe request/response schemas in a monorepo package consumed by both `server` and `client`.
   - Single contract change simultaneously validates the server route and provides autocompletion in React.
2. **Server State Delegation (TanStack Query):**
   - Use `@tanstack/react-query` (already present in `client/package.json`) with standardized query keys and mutation cache invalidation.
   - Keep `Zustand` exclusively for local client UI state (modals, active drawer, sidebar, theme).
3. **Pragmatic Service Layer:**
   - Eliminate 1-line pass-through repositories for straightforward CRUD; allow domain services to query Drizzle directly while retaining testability in TypeScript.
4. **Canonical Reference Slice:**
   - Establish a documented reference pattern (`docs/architecture/feature-slice-recipe.md`) so all future feature development adheres to the same low-boilerplate standard.

---

## Dependency Graph
```
packages/contracts (Zod contracts & DTO schemas)
   │
   ├── server/src/modules/tickets/routes/ticketRoutes.ts (contract validation)
   │       │
   │       └── server/src/modules/tickets/services/TicketService.ts (pragmatic Drizzle queries)
   │
   └── client/src/hooks/queries/useTickets.ts (TanStack Query hooks)
           │
           └── client/src/pages/TicketsPage.tsx (UI consuming typed query hooks)
```

---

## Task List

### Phase 1: Shared Contract Foundation (`packages/contracts`)
- [ ] Task 1: Scaffold `@shared/contracts` Package in Monorepo
- [ ] Task 2: Define Canonical Ticket API Contract & Zod Schemas

### Checkpoint: Contract Foundation
- [ ] Package builds cleanly via `npm run build:packages`
- [ ] Contract types importable in both `server` and `client`

### Phase 2: Client TanStack Query Infrastructure & Ticket Hooks
- [ ] Task 3: Configure Global TanStack `QueryClient` in Client
- [ ] Task 4: Implement Type-Safe Ticket Query & Mutation Hooks
- [ ] Task 5: Refactor Ticket List View & Creation to use Query Hooks

### Checkpoint: Client Query Migration
- [ ] Client unit tests pass (`npm -w client run test:run`)
- [ ] Ticket table and create modal operate with automatic caching, loading, and error states
- [ ] No regression in UI or localization

### Phase 3: Server Route Integration & Standardized Recipe
- [ ] Task 6: Implement Contract-Driven Route Validation on Server Ticket Endpoints
- [ ] Task 7: Document Canonical Feature Slice Recipe for Future Modules

### Checkpoint: Complete Vertical Slice Validation
- [ ] Backend test suites pass (`npm -w server run test`)
- [ ] Client test suites pass (`npm -w client run test:run`)
- [ ] Clean typecheck & build across workspaces (`npm -w server run build` & `npm -w client run build`)

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **Breaking existing Express routes** | High | Apply the contract-driven validation incrementally to `/api/v1/tickets` without changing existing endpoint URLs or HTTP status semantics. |
| **Package build / linking issues in monorepo** | Medium | Follow the established ESM/CJS dual-build pattern used by `@shared/errors` (`packages/errors`). |
| **TanStack Query cache stale data** | Medium | Implement explicit `queryClient.invalidateQueries({ queryKey: ['tickets'] })` on all ticket mutations (create, status update, assignment). |

---

## Open Questions
- Should `@shared/contracts` adopt `@ts-rest/core` for full OpenAPI auto-generation, or start as a pure Zod contract definition package? *(Defaulting to pure Zod contract definitions with zero heavy external runtime overhead for the pilot).*
