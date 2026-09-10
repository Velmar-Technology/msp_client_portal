# Task List: Odoo-Style Ticket Chatter & Decoupled Drawer

## Phase 1: Backend Data Model & Internal Notes Protection

### Task 1.1: Database Schema & Migration for `is_internal`
**Description:** Add `is_internal` boolean column to `ticket_responses` table in Drizzle schema with default `false` and generate/apply migration.
**Acceptance criteria:**
- [x] Add `is_internal: boolean('is_internal').notNull().default(false)` in `server/src/shared/db/schema.ts`.
- [x] Create migration SQL file in `server/src/shared/db/migrations/` and verify migration applies cleanly.
**Verification:**
- [x] `npm -w server run build` passes.
- [x] Database schema compiles without error.
**Dependencies:** None
**Files touched:**
- `server/src/shared/db/schema.ts`
- `server/src/shared/db/migrations/043_add_ticket_response_is_internal.sql`
**Estimated scope:** Small (2 files)

---

### Task 1.2: `@shared/contracts` Updates for Internal Notes
**Description:** Update ticket response Zod schemas and TypeScript contracts to include optional `isInternal: boolean`.
**Acceptance criteria:**
- [x] Update `AgentTicketMessageSchema` and `TicketResponseSchema` in `packages/contracts/src/tickets/tickets.contract.ts` with `isInternal: z.boolean().optional()`.
- [x] Add `isInternal` to `AddTicketResponseInputSchema` or response payload types.
- [x] Export updated types from `@shared/contracts`.
**Verification:**
- [x] `npm run build:packages` succeeds with exit code 0.
**Dependencies:** Task 1.1
**Files touched:**
- `packages/contracts/src/tickets/tickets.contract.ts`
**Estimated scope:** Small (1 file)

---

### Task 1.3: `TicketResponseRepository` & `TicketResponseService` RBAC Filtering & Side-Effect Suppression
**Description:** Enforce tenant/role isolation in queries (clients never see internal notes) and suppress external notifications for internal notes.
**Acceptance criteria:**
- [x] In `TicketResponseRepository.ts`: update queries to include `is_internal` column and provide role-aware query filtering.
- [x] In `TicketResponseService.ts`: when `ctx.role === 'CLIENT'`, filter out `is_internal = true` responses.
- [x] If `isInternal === true`, skip `notifyResponseRecipient` (zero emails sent to client).
- [x] If `isInternal === true`, skip `agentGw.pushTicketChatMessage` (desktop workstation tray does not receive staff notes).
- [x] In `streamGw.broadcastToTicket`: include `isInternal` flag so client sockets discard or gateway skips sending to client sessions.
**Verification:**
- [x] `npm -w server run build` passes.
**Dependencies:** Task 1.2
**Files touched:**
- `server/src/modules/tickets/repositories/TicketResponseRepository.ts`
- `server/src/modules/tickets/services/TicketResponseService.ts`
- `server/src/modules/tickets/controllers/TicketController.ts`
**Estimated scope:** Medium (3 files)

---

### Task 1.4: Backend Unit Tests for Internal Notes Isolation
**Description:** Implement unit tests verifying that clients cannot query internal notes and that external side-effects are suppressed.
**Acceptance criteria:**
- [x] Test verifying `getTicketResponses` excludes internal notes when invoked with a `CLIENT` role context.
- [x] Test verifying `getTicketResponses` includes internal notes when invoked with `TECHNICIAN` or `ADMIN` role context.
- [x] Test verifying `addTicketResponse` with `isInternal: true` does not trigger email notification or agent tray push.
**Verification:**
- [x] `npm -w server test -- src/modules/tickets/services/TicketResponseService.test.ts` passes 100%.
**Dependencies:** Task 1.3
**Files touched:**
- `server/src/modules/tickets/services/TicketResponseService.test.ts`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Backend Foundation
- [x] `npm run build:packages` passes clean
- [x] `npm -w server run build` passes clean
- [x] `npm -w server test -- src/modules/tickets/services/TicketResponseService.test.ts` passes clean

---

## Phase 2: Client Service & Real-Time Stream Integration

### Task 2.1: `ticketService.ts` Updates for `isInternal` Flag & Multi-Part Upload
**Description:** Update `TicketResponseItem` interface and `createResponse` method in `ticketService.ts` to support optional `isInternal` boolean parameter.
**Acceptance criteria:**
- [x] `TicketResponseItem` includes `is_internal?: boolean` and `isInternal?: boolean`.
- [x] `ticketService.createResponse(id, message, files, isInternal)` appends `isInternal` to FormData.
**Verification:**
- [x] `npm -w client run build` succeeds without type errors.
**Dependencies:** Task 1.4
**Files touched:**
- `client/src/features/tickets/api/ticketService.ts`
**Estimated scope:** Small (1 file)

---

### Task 2.2: `useTicketDetail.ts` & `useTicketChatStream.ts` Updates for Dual Mode & Real-Time Notes
**Description:** Update `useTicketDetail` hook to track `isInternalNote` composer mode and integrate with real-time stream.
**Acceptance criteria:**
- [x] Add state `isInternalNote` (boolean) to `useTicketDetail`.
- [x] Update `handleSendResponse` to pass `isInternalNote` to `ticketService.createResponse`.
- [x] Update `useTicketChatStream` to avoid appending internal notes if the viewer is a `CLIENT`.
**Verification:**
- [x] `npm -w client run build` succeeds without type errors.
**Dependencies:** Task 2.1
**Files touched:**
- `client/src/features/tickets/hooks/useTicketDetail.ts`
- `client/src/features/tickets/hooks/useTicketChatStream.ts`
**Estimated scope:** Small (2 files)

---

## Checkpoint: Client State Ready
- [x] `npm -w client run build` builds clean

---

## Phase 3: Odoo-Style Chatter Components & Dual-Mode Composer

### Task 3.1: Build `TicketChatterComposer` (Message vs Internal Note Tabs)
**Description:** Create dedicated composer component supporting dual modes ("Send Message" vs "Log Note"), file upload preview, and keyboard submission (`Ctrl+Enter`).
**Acceptance criteria:**
- [x] Create `client/src/features/tickets/components/TicketChatterComposer.tsx`.
- [x] Include tabs: "Send Message" (Blue action) and "Log Note" (Amber action with Lock icon).
- [x] "Log Note" tab is conditionally rendered only for technicians and admins (`user.role !== 'CLIENT'`).
- [x] Dynamic placeholder and button label reflecting mode ("Send response to customer..." vs "Log internal note (staff only)...").
- [x] Support keyboard submit (`Ctrl+Enter` / `Cmd+Enter`).
**Verification:**
- [x] `npm -w client run build` succeeds.
**Dependencies:** Task 2.2
**Files touched:**
- `client/src/features/tickets/components/TicketChatterComposer.tsx`
- `client/src/features/tickets/components/index.ts`
**Estimated scope:** Small (2 files)

---

### Task 3.2: Refactor `TicketResponses` into `TicketChatter` with Internal Note Theming
**Description:** Update message rendering to support internal note styling (amber border, staff badge, eye-off icon) and auto-scroll.
**Acceptance criteria:**
- [x] Internal notes display with amber accent, "Internal Note" badge, and distinct visual treatment.
- [x] Regular messages maintain clean conversational speech bubbles (Tech on right/left per role, Client on opposite).
- [x] Component auto-scrolls smoothly to the latest response upon new message receipt.
**Verification:**
- [x] `npm -w client run build` succeeds.
**Dependencies:** Task 3.1
**Files touched:**
- `client/src/features/tickets/components/TicketResponses.tsx`
- `client/src/features/tickets/components/TicketChatter.tsx`
- `client/src/features/tickets/components/index.ts`
**Estimated scope:** Medium (3 files)

---

## Checkpoint: Chatter Component Ready
- [x] Composer and chat list render properly with dual-mode tabs and internal note theming

---

## Phase 4: Layout Decoupling & Sheet Drawer in `TicketDetailPage`

### Task 4.1: Implement `TicketChatterDrawer` with Radix `Sheet` & `useUrlState`
**Description:** Build drawer wrapper component using `Sheet` that synchronizes open/closed state with URL query parameter `?chat=open`.
**Acceptance criteria:**
- [x] Create `client/src/features/tickets/components/TicketChatterDrawer.tsx` wrapping `Sheet`, `SheetContent`, and `SheetHeader`.
- [x] Integrate with `useUrlState` or `useSearchParams` so `?chat=open` automatically controls the drawer.
- [x] Provide smooth opening/closing transitions and clean mobile header with ticket ID.
**Verification:**
- [x] `npm -w client run build` succeeds.
**Dependencies:** Task 3.2
**Files touched:**
- `client/src/features/tickets/components/TicketChatterDrawer.tsx`
- `client/src/features/tickets/components/index.ts`
**Estimated scope:** Small (2 files)

---

### Task 4.2: Refactor `TicketDetailPage.tsx` for Responsive Side-by-Side & Mobile Drawer
**Description:** Decouple `TicketResponses` from the static left column in `TicketDetailPage.tsx`. On `xl:` viewports, display persistent side-by-side Chatter; on `< xl:`, show slide-over drawer triggered by header button.
**Acceptance criteria:**
- [x] On `xl:` (`>= 1280px`), render two-column workspace: left pane (ticket description, telemetry snapshot, timeline) and right pane (`TicketChatter`).
- [x] On `< xl:`, render single column layout and mount `TicketChatterDrawer`.
- [x] In `TicketDetailHeader`, add Chatter toggle button with response counter badge (e.g., "💬 5 responses") that opens the drawer or toggles desktop pane.
- [x] Ensure no duplicate rendering of responses when transitioning breakpoints.
**Verification:**
- [x] `npm -w client run build` succeeds.
- [x] Visual verification of desktop side-by-side and mobile drawer behavior.
**Dependencies:** Task 4.1
**Files touched:**
- `client/src/features/tickets/pages/TicketDetailPage.tsx`
- `client/src/features/tickets/components/TicketDetailHeader.tsx`
**Estimated scope:** Medium (2 files)

---

## Checkpoint: Responsive UX Complete
- [x] Layout renders side-by-side on wide screens
- [x] Mobile/tablet view opens drawer cleanly via header toggle button and `?chat=open`

---

## Phase 5: Verification & Full Suite Validation

### Task 5.1: Unit & Component Tests for `TicketChatter` & `TicketDetailPage`
**Description:** Add/update frontend test coverage for the decoupled chatter and dual-mode composer.
**Acceptance criteria:**
- [x] Test verifying `TicketChatterComposer` hides "Log Note" tab for clients.
- [x] Test verifying `TicketChatterDrawer` toggles based on open prop / state.
**Verification:**
- [x] `npm -w client run test:run` passes 100%.
**Dependencies:** Task 4.2
**Files touched:**
- `client/src/features/tickets/components/TicketChatter.test.tsx`
**Estimated scope:** Small (1-2 files)

---

### Task 5.2: Full Monorepo Typecheck & Test Suite Execution
**Description:** Verify end-to-end repository health across packages, server, and client.
**Acceptance criteria:**
- [x] `npm run build:packages` succeeds with exit code 0.
- [x] `npm -w server run build` succeeds with exit code 0.
- [x] `npm -w client run build` succeeds with exit code 0.
- [x] `npm -w server run test` passes without regressions.
- [x] `npm -w client run test:run` passes without regressions.
**Verification:**
- [x] All automated gates pass green.
**Dependencies:** Task 5.1
**Files touched:**
- Monorepo wide
**Estimated scope:** Verification (0 files modified)
