# Task Breakdown: Endpoint No-Login Ticket Creation & Real-Time Tray Chat

## Phase 1: Database Schema & Shared Contracts

### Task 1.1: Database Migration `042_add_ticket_reporter_and_agent_metadata.sql`
**Description:** Create migration adding `reporter_name`, `reporter_email`, `source` (default 'WEB'), and `device_snapshot` (JSONB) to `tickets`, plus `author_name` to `ticket_responses`.
**Acceptance criteria:**
- [x] Migration file `042_add_ticket_reporter_and_agent_metadata.sql` created in `server/src/shared/db/migrations/`.
- [x] Safe `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ...` execution.
- [x] Safe `ALTER TABLE ticket_responses ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);`.
**Verification:**
- [x] Migration syntax check and manual verification.
**Dependencies:** None
**Files touched:**
- `server/src/shared/db/migrations/042_add_ticket_reporter_and_agent_metadata.sql`
**Estimated scope:** Small (1 file)

---

### Task 1.2: Update Drizzle Schema & Shared Domain Types
**Description:** Update `tickets` and `ticketResponses` definitions in `server/src/shared/db/schema.ts` and domain types in `server/src/shared/types/index.ts`.
**Acceptance criteria:**
- [x] `tickets` table definition includes `reporter_name`, `reporter_email`, `source`, and `device_snapshot`.
- [x] `ticketResponses` table definition includes `author_name`.
- [x] `Ticket` and `TicketResponse` domain interfaces in `server/src/shared/types/index.ts` updated to match schema.
**Verification:**
- [x] `npm -w server run build` passes without type errors.
**Dependencies:** Task 1.1
**Files touched:**
- `server/src/shared/db/schema.ts`
- `server/src/shared/types/index.ts`
**Estimated scope:** Small (2 files)

---

### Task 1.3: Define Agent Ticket Contracts in `@shared/contracts`
**Description:** Define Zod schemas and TypeScript contracts for agent ticket submission, flight recorder diagnostics, and agent chat responses in `packages/contracts/src/tickets/`.
**Acceptance criteria:**
- [x] `CreateAgentTicketInputSchema` created with reporter info, title, description, category, and `device_snapshot` object.
- [x] `CreateAgentTicketResponseSchema` created returning created ticket summary, assigned tech, and initial response token.
- [x] `AddAgentTicketResponseInputSchema` created with message and optional base64 attachment or snip.
- [x] Contracts exported from `packages/contracts/src/index.ts`.
**Verification:**
- [x] `npm run build:packages` succeeds with exit code 0.
- [x] Unit tests pass in `packages/contracts/src/tickets/tickets.contract.test.ts`.
**Dependencies:** Task 1.2
**Files touched:**
- `packages/contracts/src/tickets/tickets.contract.ts`
- `packages/contracts/src/tickets/tickets.contract.test.ts`
- `packages/contracts/src/index.ts`
**Estimated scope:** Small (3 files)

---

## Checkpoint 1: Contracts & Database Schema Active
- [x] `npm run build:packages` succeeds with exit code 0.
- [x] `npm -w server run build` compiles cleanly.

---

## Phase 2: Backend Ingestion, Security & WebSocket Push

### Task 2.1: Implement `agentAuthMiddleware` for Machine-Bound Token Validation
**Description:** Create middleware that extracts `Bearer <agentToken>` from the `Authorization` header, validates against `subscription_equipment.agent_token`, and verifies that the equipment slot is in `ACTIVE` or `BOUND` status. Attaches `req.agent = { equipmentId, slotId, tenantId, clientId, hostname }` to the request object.
**Acceptance criteria:**
- [x] Rejects missing or malformed token with 401 `UnauthorizedError`.
- [x] Rejects inactive or unprovisioned equipment with 403 `ForbiddenError`.
- [x] Successfully injects `equipmentId`, `tenantId`, and client owner `clientId` into Express request.
- [x] Unit tests covering valid, invalid, and revoked agent tokens.
**Verification:**
- [x] Vitest test suite `server/src/shared/middleware/agentAuthMiddleware.test.ts` passes.
**Dependencies:** Checkpoint 1
**Files touched:**
- `server/src/shared/middleware/agentAuthMiddleware.ts`
- `server/src/shared/middleware/agentAuthMiddleware.test.ts`
**Estimated scope:** Small (2 files)

---

### Task 2.2: Implement `TicketService.createFromAgent` with BL-201 & BL-102
**Description:** Add `createFromAgent` method to `TicketService` that enforces the monthly ticket quota (`BL-201`), validates input via `CreateAgentTicketInputSchema`, creates the ticket in PostgreSQL, applies Round-Robin Dispatch (`BL-102`) to assign an active technician, and records audit events.
**Acceptance criteria:**
- [x] Enforces `ticketQuotaService.enforceTicketLimit(tenantId)` before inserting.
- [x] Creates ticket with `source = 'AGENT'`, linking `equipment_id`, `tenant_id`, and `client_id`.
- [x] Automatically assigns technician using `assignmentService.getNextTechnician(category)`.
- [x] Dispatches ticket creation in-app and email notification to assigned technician.
- [x] Returns HTTP 201 with ticket payload.
**Verification:**
- [x] `npx vitest run src/modules/tickets/services/TicketService.test.ts` passes with new test cases.
**Dependencies:** Task 2.1
**Files touched:**
- `server/src/modules/tickets/services/TicketService.ts`
- `server/src/modules/tickets/services/TicketService.test.ts`
- `server/src/modules/tickets/controllers/TicketController.ts`
**Estimated scope:** Medium (3 files)

---

### Task 2.3: Implement `TicketService.addResponseFromAgent` & Express Agent Routes
**Description:** Implement `addResponseFromAgent` allowing workstation users to post replies and attachments to their active ticket. Add dedicated routes `POST /api/v1/tickets/agent` and `POST /api/v1/tickets/:id/responses/agent` protected by `agentAuthMiddleware`.
**Acceptance criteria:**
- [x] Validates ticket belongs to the authenticated `equipmentId` (Zero Standing Privilege).
- [x] Rejects posting to `CLOSED` or `CANCELLED` tickets with `ValidationError`.
- [x] Saves message with `author_name = req.body.reporterName` and `user_role = 'CLIENT'`.
- [x] Updates ticket `updated_at` timestamp.
- [x] Mounts Express routes in `server/src/modules/tickets/routes/ticket.routes.ts`.
**Verification:**
- [x] Controller and service tests pass in `TicketController.test.ts` and `TicketService.test.ts`.
**Dependencies:** Task 2.2
**Files touched:**
- `server/src/modules/tickets/services/TicketService.ts`
- `server/src/modules/tickets/controllers/TicketController.ts`
- `server/src/modules/tickets/routes/ticket.routes.ts`
**Estimated scope:** Medium (3 files)

---

### Task 2.4: Implement `AgentGateway.pushTicketChatMessage` WebSocket Relay
**Description:** Enhance `AgentGateway` with `pushTicketChatMessage(equipmentId, messageData)`. Connect this relay to `TicketService.addResponse` so that when a technician replies in the portal, the active WebSocket connection for that device immediately receives a `TICKET_CHAT_PUSH` frame.
**Acceptance criteria:**
- [x] Sends JSON frame `{ type: 'TICKET_CHAT_PUSH', ticketId, responseId, authorName, authorRole, message, attachments, createdAt }` to the connected agent socket.
- [x] Gracefully ignores offline agents without throwing unhandled exceptions.
- [x] Unit tests asserting that `pushTicketChatMessage` emits correct frame to active socket.
**Verification:**
- [x] `npx vitest run src/modules/rmm/services/AgentGateway.test.ts` passes with new test cases.
**Dependencies:** Task 2.3
**Files touched:**
- `server/src/modules/rmm/services/AgentGateway.ts`
- `server/src/modules/rmm/services/AgentGateway.test.ts`
- `server/src/modules/tickets/services/TicketService.ts`
**Estimated scope:** Medium (3 files)

---

## Checkpoint 2: Backend Ingestion & Push Logic Verified
- [x] `npm -w server run test` passes with zero regressions.
- [x] `npm -w server run build` compiles cleanly.

---

## Phase 3: Web Portal UI Enhancements

### Task 3.1: Add Endpoint Flight Recorder Telemetry Card to `TicketDetailPage`
**Description:** In `client/src/features/tickets/`, update `TicketDetailPage.tsx` and `TicketDescriptionCard.tsx` (or new `TicketFlightRecorderCard.tsx`) to display an `[Endpoint Agent]` source badge, reporter contact details (*"Reported by [Name] ([Email]) via Workstation [Hostname]"*), and a collapsible diagnostic telemetry card showing CPU/RAM/Disk metrics and error logs.
**Acceptance criteria:**
- [x] Displays source badge (`AGENT` vs `WEB`) on the ticket header.
- [x] Renders reporter name, reporter email, and device name prominently.
- [x] Collapsible card shows formatted CPU %, RAM %, and top processes when `device_snapshot` is present.
- [x] Gracefully renders legacy/web tickets without errors.
**Verification:**
- [x] Component test in `TicketDetailPage.test.tsx` passes.
**Dependencies:** Checkpoint 2
**Files touched:**
- `client/src/features/tickets/pages/TicketDetailPage.tsx`
- `client/src/features/tickets/components/TicketDescriptionCard.tsx`
- `client/src/features/tickets/components/TicketFlightRecorderCard.tsx`
- `client/src/features/tickets/components/index.ts`
**Estimated scope:** Medium (4 files)

---

### Task 3.2: Render Reporter Identity in `TicketResponses` Component
**Description:** Update `TicketResponses.tsx` to display `author_name` when a message originates from a desk worker via the endpoint agent (e.g. *"Sarah Jenkins (Workstation)"* instead of generic tenant name).
**Acceptance criteria:**
- [x] Shows `resp.author_name` if present; falls back to `resp.user_name`.
- [x] Displays subtle `[Endpoint]` chip next to role badge for agent-submitted responses.
- [x] Retains existing bubble styling, attachments, and download functionality.
**Verification:**
- [x] Component test in `TicketResponses.test.tsx` (or `TicketDetailPage.test.tsx`) passes.
**Dependencies:** Task 3.1
**Files touched:**
- `client/src/features/tickets/components/TicketResponses.tsx`
**Estimated scope:** Small (1 file)

---

### Task 3.3: Add Bilingual Localization in `en_US.json` and `es_DO.json`
**Description:** Add all new localization strings for agent-submitted tickets, reporter details, flight recorder labels, and telemetry stats in English (`en_US.json`) and Dominican Spanish (`es_DO.json`).
**Acceptance criteria:**
- [x] Zero hardcoded English strings in new UI components.
- [x] Full coverage in both `en_US.json` and `es_DO.json`.
**Verification:**
- [x] UI string inspection and `npm -w client run build` succeeds.
**Dependencies:** Tasks 3.1 & 3.2
**Files touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`
**Estimated scope:** Small (2 files)

---

## Checkpoint 3: Frontend Portal UI Verified
- [x] `npm -w client run test:run` passes.
- [x] `npm -w client run build` compiles with zero errors.
- [x] ADR-002 architecture AST tests pass: `npx vitest run tests/arch/feature-architecture.test.ts`.

---

## Phase 4: Agent Test Harness & Tray IPC Protocol

### Task 4.1: Create Automated Agent Ticketing & Chat Test Harness
**Description:** Create an executable integration script (`server/src/scripts/simulate-agent-ticket-flow.ts`) that boots a mock WebSocket agent client, authenticates with a paired `agentToken`, submits a ticket with flight recorder telemetry, receives a simulated technician reply push frame via WebSocket, and posts a reply.
**Acceptance criteria:**
- [x] Verifies end-to-end WebSocket connection and token handshake.
- [x] Verifies `POST /api/v1/tickets/agent` returns 201 with ticket ID.
- [x] Verifies simulated technician response triggers `TICKET_CHAT_PUSH` WebSocket frame in $< 100\text{ms}$.
- [x] Verifies reply via `POST /api/v1/tickets/:id/responses/agent` succeeds.
**Verification:**
- [x] Script runs successfully against test database/server.
**Dependencies:** Checkpoint 3
**Files touched:**
- `server/src/scripts/simulate-agent-ticket-flow.ts`
**Estimated scope:** Small (1 file)

---

### Task 4.2: Document Named Pipe / UDS IPC Protocol for `msp-tray` (Tauri v2)
**Description:** Document the complete IPC protocol and payload format for the desktop assistant in `docs/architecture/endpoint-tray-ipc-specification.md`, specifying message frames exchanged between `msp-agent` (Session 0 / root daemon) and `msp-tray` (Tauri v2 interactive companion in User Session) over `\\.\pipe\msp-agent-ipc` on Windows and `/var/run/msp-agent.sock` on macOS/Linux.
**Acceptance criteria:**
- [x] IPC frame format documented (JSON-RPC / length-prefixed JSON).
- [x] Cross-platform transport specified (Windows Named Pipes, macOS/Linux Unix Domain Sockets).
- [x] Messages defined: `TRAY_HELLO`, `AGENT_STATUS`, `TICKET_CREATE_REQUEST`, `TICKET_CREATE_RESPONSE`, `TICKET_CHAT_PUSH`, `TICKET_CHAT_SEND`.
- [x] Tauri v2 companion integration guidelines and permission boundaries documented.
**Verification:**
- [x] Review document for completeness and alignment with `docs/ideas/tauri-cross-platform-endpoint-tray.md`.
**Dependencies:** Task 4.1
**Files touched:**
- `docs/architecture/endpoint-tray-ipc-specification.md`
**Estimated scope:** Small (1 file)

---

## Checkpoint 4: Integration Simulation Cleared
- [x] Test harness executes cleanly.
- [x] IPC specification complete and aligned with server endpoints.

---

## Phase 5: Quality Gates & DoD

### Task 5.1: Run Full Test Suites (Server & Client)
**Description:** Execute full unit, integration, and architecture test suites across both server and client workspaces.
**Acceptance criteria:**
- [x] `npm -w server run test` passes with zero regressions (all 80 suites, 788 tests green).
- [x] `npm -w client run test:run` passes with zero regressions (all 45 suites, 286 tests green).
**Verification:**
- [x] Vitest output confirms 100% passing tests.
**Dependencies:** Checkpoint 4
**Files touched:** None (verification task)
**Estimated scope:** Small

---

### Task 5.2: Monorepo Clean Compilation & Build Gate
**Description:** Run production builds across shared packages, server, and client.
**Acceptance criteria:**
- [x] `npm run build:packages` exits with code 0.
- [x] `npm -w server run build` exits with code 0.
- [x] `npm -w client run build` exits with code 0.
**Verification:**
- [x] Clean exit codes on all three build commands.
**Dependencies:** Task 5.1
**Files touched:** None (verification task)
**Estimated scope:** Small

---

## Checkpoint 5: Final DoD Verified
- [x] All unit, integration, and AST tests pass.
- [x] Production builds succeed.
- [x] Documentation and architectural references complete.

---

## Phase 6: Tauri v2 Desktop Companion (`packages/msp-tray`)

### Task 6.1: Scaffold `packages/msp-tray` Workspace (Tauri v2 + React 19 + Tailwind CSS)
**Description:** Initialize `packages/msp-tray` containing `package.json`, `vite.config.ts`, `index.html`, Tailwind CSS v4 / Vanilla styling, and `src-tauri` directory with `Cargo.toml` and `tauri.conf.json` configured for tray popover.
**Acceptance criteria:**
- [x] `packages/msp-tray/package.json` with `@tauri-apps/api@^2.0.0`, `@tauri-apps/plugin-shell`, `lucide-react`, React 19.
- [x] `packages/msp-tray/vite.config.ts` configured for port 1420 and React.
- [x] `packages/msp-tray/src-tauri/Cargo.toml` with `tauri = { version = "2", features = ["tray-icon"] }`, `serde`, `serde_json`, `tokio`, `sysinfo`.
- [x] `packages/msp-tray/src-tauri/tauri.conf.json` configuring tray icon and frameless popover window.
**Verification:**
- [x] `npm install` and workspace detection succeeds.
- [x] `npm -w packages/msp-tray run build` passes.
**Dependencies:** None
**Files touched:**
- `packages/msp-tray/package.json`
- `packages/msp-tray/vite.config.ts`
- `packages/msp-tray/tsconfig.json`
- `packages/msp-tray/index.html`
- `packages/msp-tray/src/index.css`
- `packages/msp-tray/src/main.tsx`
- `packages/msp-tray/src-tauri/Cargo.toml`
- `packages/msp-tray/src-tauri/tauri.conf.json`
- `packages/msp-tray/src-tauri/build.rs`
- `packages/msp-tray/src-tauri/src/main.rs`
- `packages/msp-tray/src-tauri/src/lib.rs`
**Estimated scope:** Medium (10 files)

---

### Task 6.2: Implement Local IPC Transport & Tauri Commands
**Description:** Implement `src-tauri/src/ipc.rs` handling connection to `\\.\pipe\msp-agent-ipc` (with standalone direct REST/WS fallback mode), and expose Tauri commands: `get_agent_status`, `get_system_vitals`, `create_ticket`, and `send_chat_message`.
**Acceptance criteria:**
- [x] Named Pipe transport with 4-byte big-endian framing conforming to IPC specification.
- [x] Fallback direct API mode using local agent token if daemon pipe is offline.
- [x] Live vitals sampler using `sysinfo` (CPU, Memory, Disk, Active Window).
- [x] Tauri invoke handlers registered in `lib.rs`.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` compiles without errors.
**Dependencies:** Task 6.1
**Files touched:**
- `packages/msp-tray/src-tauri/src/ipc.rs`
- `packages/msp-tray/src-tauri/src/lib.rs`
**Estimated scope:** Small (2 files)

---

### Task 6.3: Implement Shift-Worker Attribution & Local Persistence
**Description:** Create `src/components/AttributionModal.tsx` and persistence store that prompts for Name and Email on first launch, caches in local storage/config, and allows seamless switching between shift workers.
**Acceptance criteria:**
- [x] Prompts on first use if attribution is missing.
- [x] Validates email format and non-empty name.
- [x] Caches identity locally in localStorage.
- [x] Allows editing attribution from header/settings button.
**Verification:**
- [x] Component renders and handles submit/save cleanly.
**Dependencies:** Task 6.1
**Files touched:**
- `packages/msp-tray/src/components/AttributionModal.tsx`
- `packages/msp-tray/src/services/attribution.ts`
**Estimated scope:** Small (2 files)

---

### Task 6.4: Implement Tray Drawer & 1-Click Ticket Creation Modal
**Description:** Build `QuickTicketModal.tsx` allowing 1-click issue reporting with title, description, category selector, priority, and real-time live flight recorder diagnostics preview badge.
**Acceptance criteria:**
- [x] Category selector (`HELPDESK`, `HARDWARE`, `SOFTWARE`, `NETWORK`, `ACCESS`).
- [x] Live diagnostics status chip showing CPU %, RAM %, and Disk % from `get_system_vitals`.
- [x] Submits ticket through Tauri IPC `create_ticket` command.
- [x] Displays success notification with ticket ID and auto-opens chat drawer.
**Verification:**
- [x] Form submission triggers command with valid payload.
**Dependencies:** Tasks 6.2, 6.3
**Files touched:**
- `packages/msp-tray/src/components/QuickTicketModal.tsx`
- `packages/msp-tray/src/components/Header.tsx`
**Estimated scope:** Small (2 files)

---

### Task 6.5: Implement Live Chat Drawer Mirroring `TicketResponses.tsx`
**Description:** Build `LiveChatDrawer.tsx` allowing real-time bidirectional conversation between the desk worker and the assigned technician. Supports message threads, role badges (`TECHNICIAN`, `CLIENT`), timestamp formatting, and instant sending.
**Acceptance criteria:**
- [x] Renders incoming and outgoing chat bubbles with technician vs client styling.
- [x] Auto-scrolls to bottom on new messages.
- [x] Listens to `ticket_chat_push` Tauri events emitted from IPC.
- [x] Audio/visual alert on new message when window is hidden or blurred.
- [x] Allows marking ticket as `RESOLVED` directly from header (without CSAT popup per specification).
**Verification:**
- [x] Chat UI handles message submission and real-time updates without layout breakage.
**Dependencies:** Tasks 6.2, 6.4
**Files touched:**
- `packages/msp-tray/src/components/LiveChatDrawer.tsx`
- `packages/msp-tray/src/components/TicketBadge.tsx`
- `packages/msp-tray/src/App.tsx`
**Estimated scope:** Medium (3 files)

---

### Task 6.6: Compilation, Build Verification & Integration Testing
**Description:** Verify frontend compilation, Rust compilation, clean build artifacts, and test connectivity against the running backend server.
**Acceptance criteria:**
- [x] `npm -w packages/msp-tray run build` compiles Vite bundle cleanly with 0 TypeScript errors.
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` passes with 0 errors.
- [x] Monorepo verification: `npm -w server run test` and `npm -w client run test:run` remain 100% green.
**Verification:**
- [x] Clean build and test runs.
**Dependencies:** Tasks 6.1 - 6.5
**Files touched:** None (verification task)
**Estimated scope:** Small

---

## Checkpoint 6: Tauri Desktop Assistant Operational
- [x] `packages/msp-tray` builds cleanly (TypeScript + Rust).
- [x] All unit and integration tests across monorepo pass.
- [x] End-to-end simulated ticket and chat flow verified.

