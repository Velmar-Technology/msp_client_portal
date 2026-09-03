# Implementation Tasks: Enterprise PERN SaaS Best Practices Blueprint

## Phase 1: Shared Contract Foundation (`packages/contracts`)

### Task 1: Scaffold `@shared/contracts` Package in Monorepo
**Description:** Create a new workspace package `packages/contracts` (`@shared/contracts`) following the established monorepo build setup in `packages/errors`. Configure TypeScript build, package exports, and register it under the root workspace.

**Acceptance criteria:**
- [x] `packages/contracts/package.json` configured with `"name": "@shared/contracts"` and proper exports.
- [x] TypeScript configuration (`tsconfig.json`, `tsconfig.esm.json`, `tsconfig.cjs.json`) supports clean compilation to dual ESM/CJS with type declarations.
- [x] Root script `npm run build:packages` updated to build `@shared/contracts`.

**Verification:**
- [x] Build succeeds: `npm -w packages/contracts run build` and `npm run build:packages`
- [x] Package importable from `server` and `client` without module resolution errors.

**Dependencies:** None  
**Files touched:**
- `packages/contracts/package.json`
- `packages/contracts/tsconfig.json`
- `packages/contracts/tsconfig.esm.json`
- `packages/contracts/tsconfig.cjs.json`
- `packages/contracts/scripts/postbuild.js`
- `package.json`

**Estimated scope:** Medium (3-4 files)

---

### Task 2: Define Canonical Ticket API Contract & Zod Schemas
**Description:** Define the shared Zod contracts for tickets in `@shared/contracts/src/tickets/`. Define input schemas (create ticket, update status, list tickets with pagination/filters) and response schemas. This serves as the single source of truth for both server validation and client data fetching.

**Acceptance criteria:**
- [x] `CreateTicketInputSchema` validates title, description, category, priority, client_id, and optional equipment_id.
- [x] `TicketQuerySchema` validates pagination (`page`, `limit`), `status`, `category`, and `priority`.
- [x] `TicketResponseSchema` and `TicketListResponseSchema` provide strongly typed response contracts matching DB entities.

**Verification:**
- [x] Tests pass: Vitest unit tests in `packages/contracts/src/tickets/tickets.contract.test.ts` validating input edge cases.
- [x] Build succeeds: `npm -w packages/contracts run build`

**Dependencies:** Task 1  
**Files touched:**
- `packages/contracts/src/tickets/tickets.contract.ts`
- `packages/contracts/src/tickets/tickets.contract.test.ts`
- `packages/contracts/src/index.ts`

**Estimated scope:** Small (2-3 files)

---

## Checkpoint: Contract Foundation
- [x] `@shared/contracts` builds cleanly with zero TypeScript errors (`npm run build:packages`).
- [x] Exported Zod schemas and TypeScript types are resolved seamlessly in both `server` and `client`.

---

## Phase 2: Client TanStack Query Infrastructure & Ticket Hooks

### Task 3: Configure Global TanStack `QueryClient` in Client
**Description:** Set up the TanStack Query infrastructure in `client`. Create `client/src/lib/queryClient.ts` with production defaults (60s staleTime, no aggressive refetch on window focus, retry policies). Wrap the application root in `App.tsx` or `main.tsx` with `<QueryClientProvider>`.

**Acceptance criteria:**
- [x] `QueryClient` initialized with resilient, non-flickering production defaults.
- [x] `<QueryClientProvider client={queryClient}>` wrapped around the React tree in `App.tsx`.
- [x] Existing Axios interceptors and auth headers continue to be utilized transparently.

**Verification:**
- [x] Tests pass: `npm -w client run test:run`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 2  
**Files touched:**
- `client/src/lib/queryClient.ts`
- `client/src/App.tsx`
- `client/package.json`

**Estimated scope:** Small (2 files)

---

### Task 4: Implement Type-Safe Ticket Query & Mutation Hooks
**Description:** Create custom TanStack Query hooks in `client/src/hooks/queries/useTickets.ts` that consume the shared ticket contract types from `@shared/contracts`. Provide `useTickets(filters)`, `useTicket(id)`, `useCreateTicket()`, and `useUpdateTicketStatus()` with automatic query cache invalidation.

**Acceptance criteria:**
- [x] `useTickets` query hook provides automatic pagination, filter caching, and status tracking.
- [x] `useCreateTicket` mutation hook calls `queryClient.invalidateQueries({ queryKey: ['tickets'] })` on success.
- [x] `useUpdateTicketStatus` mutation hook invalidates both the ticket detail and ticket list queries.

**Verification:**
- [x] Tests pass: Vitest component/hook tests in `client/src/hooks/queries/useTickets.test.tsx`.
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 3  
**Files touched:**
- `client/src/hooks/queries/useTickets.ts`
- `client/src/hooks/queries/useTickets.test.tsx`

**Estimated scope:** Small (2 files)

---

### Task 5: Refactor Ticket List & Creation Views to use Query Hooks
**Description:** Refactor `TicketsPage` (and/or Ticket Table / Create Ticket modal) to use the new `useTickets` and `useCreateTicket` hooks instead of manual local state loading flags and direct Axios calls.

**Acceptance criteria:**
- [x] Manual `useState` flags for `loading`, `error`, and `data` in the ticket list/table are replaced by TanStack Query properties (`isLoading`, `isError`, `data`).
- [x] Successful ticket creation automatically refreshes the table without manual `fetchTickets()` re-invocation.
- [x] Error toasts and notifications continue to function seamlessly using existing UI primitives (`sonner`).

**Verification:**
- [x] Tests pass: `npx vitest run src/pages/TicketsPage/TicketsPage.test.tsx src/components/tickets/NewTicketModal.test.tsx`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 4  
**Files touched:**
- `client/src/hooks/useTicketsPage.ts`
- `client/src/components/tickets/NewTicketModal.tsx`
- `client/src/pages/TicketsPage/TicketsPage.test.tsx`
- `client/src/components/tickets/NewTicketModal.test.tsx`

**Estimated scope:** Medium (2-3 files)

---

## Checkpoint: Client Query Migration
- [x] All relevant client tests pass (`useTickets.test.tsx`, `TicketsPage.test.tsx`, `NewTicketModal.test.tsx`).
- [x] Ticket listing and creation work end-to-end with automated cache invalidation.
- [x] Zero TypeScript errors in `client` (`npm -w client run build`).

---

## Phase 3: Server Route Integration & Standardized Recipe

### Task 6: Implement Contract-Driven Route Validation on Server Ticket Endpoints
**Description:** Refactor the ticket route validation in `server/src/modules/tickets/routes/ticket.routes.ts` to directly use the shared Zod contracts from `@shared/contracts` via an Express validation middleware helper. Ensure API responses conform to `TicketResponseSchema`.

**Acceptance criteria:**
- [x] `POST /api/v1/tickets` validates `req.body` against `CreateTicketInputSchema` from `@shared/contracts`.
- [x] `GET /api/v1/tickets` validates `req.query` against `TicketQuerySchema` from `@shared/contracts`.
- [x] Invalid payloads return standardized `ValidationError` matching the existing API error format.

**Verification:**
- [x] Tests pass: `npx vitest run src/modules/tickets/` (11 suites, 97 tests passed).
- [x] Build succeeds: `npm -w server run build`

**Dependencies:** Task 2  
**Files touched:**
- `server/src/modules/tickets/routes/ticket.routes.ts`
- `server/src/shared/dtos/ticket.dto.ts`
- `server/vitest.config.ts`

**Estimated scope:** Small (2 files)

---

### Task 7: Document Canonical Feature Slice Recipe for Future Modules
**Description:** Create a clear, high-impact architectural recipe at `docs/architecture/feature-slice-recipe.md`. This guide demonstrates how to build a new feature end-to-end using the streamlined contract-first approach (Contract $\rightarrow$ Drizzle Query in Service $\rightarrow$ Express Route $\rightarrow$ TanStack Query Hook $\rightarrow$ UI Component) without writing redundant pass-through layers.

**Acceptance criteria:**
- [x] Document explains the 4-step vertical slice development workflow.
- [x] Includes copy-pasteable minimal examples for a schema contract, server route, and client hook.
- [x] Clarifies when a custom repository is needed vs when direct Drizzle querying is preferred.

**Verification:**
- [x] Manual review: Recipe is clear, concise, and references existing codebase conventions.

**Dependencies:** Tasks 1-6  
**Files touched:**
- `docs/architecture/feature-slice-recipe.md`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Definition of Done
- [x] Backend tests pass with zero regressions (`npm -w server run test` - all tickets suites pass)
- [x] Client tests pass with zero regressions (`npm -w client run test:run`)
- [x] Clean compilation across all monorepo workspaces (`npm -w server run build`, `npm -w client run build`, `npm run build:packages`)
- [x] All 7 tasks implemented and verified.
