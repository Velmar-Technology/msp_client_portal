# Implementation Plan: Odoo-Style Ticket Chatter & Decoupled Drawer

## Overview
Decouple the embedded `TicketResponses` card from `TicketDetailPage.tsx` into a responsive, Odoo-inspired Chatter workspace. On wide desktop screens (`xl:`), the Chatter lives side-by-side with ticket specifications and diagnostic telemetry in an independently scrollable pane; on smaller screens, it collapses into a slide-over `Sheet` drawer synchronized with the `?chat=open` URL query parameter. Furthermore, it introduces enterprise dual-mode collaboration for technicians ("Send Message" to client vs. "Log Internal Note" for private staff communication with zero customer leakage).

---

## Architecture & Design Decisions

1. **Responsive Odoo Layout Pattern:**
   - On `xl:` (`>= 1280px`), `TicketDetailPage` splits into a two-column workspace:
     - Left pane (`w-full xl:w-[62%] xl:flex-1`): Ticket header, description, hardware flight recorder / telemetry snapshot, and lifecycle timeline.
     - Right pane (`w-full xl:w-[38%] xl:max-w-xl`): Pinned or collapsible `TicketChatter` panel with full conversation history and composer.
   - On `< xl:` (`< 1280px`), the right pane collapses. A sticky header button or floating pill ("💬 Conversation · [N]") opens the Radix `Sheet` drawer from the right.
   - A toggle button on wide screens allows collapsing the Chatter pane to view full-width telemetry diagnostics when needed.

2. **URL State Synchronization (`useUrlState`):**
   - The open/closed state of the drawer on mobile/tablet (and collapsed state on desktop) syncs with `?chat=open` so users can link directly to the chat thread from notifications, emails, or agent tray alerts.

3. **Data Security & Privacy (Strict Non-Leakage of Internal Notes):**
   - New database column on `ticket_responses`: `is_internal: boolean` default `false`.
   - In `TicketResponseRepository` and `TicketResponseService`:
     - If user role is `CLIENT`, SQL query strictly filters `is_internal = false`.
     - Client notification emails (`notifyResponseRecipient`) and MSP agent tray pushes (`agentGw.pushTicketChatMessage`) are **NEVER** dispatched for internal notes.
     - Web portal stream gateway broadcasts internal notes with `isInternal: true`, and client WebSocket handlers discard or the gateway omits them for client connections.

4. **Dual-Mode Composer UI:**
   - Tabs at top of composer: **"Send Message"** (blue action) and **"Log Note"** (amber action with lock icon).
   - The "Log Note" tab is strictly hidden for clients (`user.role === 'CLIENT'`).
   - Internal notes render with an amber-tinted background, a discreet "Staff Note" badge, and an eye-off icon, clearly distinguishing them from public dialogue.

---

## Risk Analysis & Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Leakage of internal staff notes to clients | Critical | Enforce filter at the Drizzle repository and service layers (`where: and(eq(ticketId), eq(is_internal, false))`). Never rely purely on frontend hiding. |
| Layout squishing on smaller laptop screens (1024-1279px) | Medium | Breakpoint set at `xl:` (1280px). Screens under 1280px fold into the slide-over `Sheet` drawer automatically. |
| Unread message counters desynchronizing | Low | Invalidate TanStack Query key `['ticket', id, 'responses']` upon send or WebSocket event receipt. |

---

## Task Breakdown Index

### Phase 1: Backend Data Model & Internal Notes Protection
- [ ] Task 1.1: Database Schema & Migration for `is_internal`
- [ ] Task 1.2: `@shared/contracts` Updates for Internal Notes
- [ ] Task 1.3: `TicketResponseRepository` & `TicketResponseService` RBAC Filtering & Side-Effect Suppression
- [ ] Task 1.4: Backend Unit Tests for Internal Notes Isolation
- **Checkpoint: Backend Foundation Green**

### Phase 2: Client Service & Real-Time Stream Integration
- [ ] Task 2.1: `ticketService.ts` Updates for `isInternal` Flag & Multi-Part Upload
- [ ] Task 2.2: `useTicketDetail.ts` & `useTicketChatStream.ts` Updates for Dual Mode & Real-time Notes
- **Checkpoint: Client State Ready**

### Phase 3: Odoo-Style Chatter Components & Dual-Mode Composer
- [ ] Task 3.1: Build `TicketChatterComposer` (Message vs Internal Note Tabs)
- [ ] Task 3.2: Refactor `TicketResponses` into `TicketChatter` with Internal Note Theming
- **Checkpoint: Chatter Component Ready**

### Phase 4: Layout Decoupling & Sheet Drawer in `TicketDetailPage`
- [ ] Task 4.1: Implement `TicketChatterDrawer` with Radix `Sheet` & `useUrlState`
- [ ] Task 4.2: Refactor `TicketDetailPage.tsx` for Responsive Side-by-Side & Mobile Drawer
- **Checkpoint: Responsive UX Complete**

### Phase 5: Verification & Full Suite Validation
- [ ] Task 5.1: Unit & Component Tests for `TicketChatter` & `TicketDetailPage`
- [ ] Task 5.2: Full Monorepo Typecheck & Test Suite Execution
