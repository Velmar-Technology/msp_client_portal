# Task Breakdown: MSP Tray to MSP Agent Named Pipe IPC Bridge

## Phase 1: Backend Machine-Authenticated Endpoints & Contracts

### Task 1.1: Define Agent Active Ticket & History Contracts in `@shared/contracts`
**Description:** Define Zod schemas and TypeScript types in `@shared/contracts` for machine-authenticated active ticket retrieval, message history queries, and ticket status resolution.
**Acceptance criteria:**
- [x] Create `AgentActiveTicketResponseSchema` (returns active ticket or null, with device identity and assigned technician).
- [x] Create `AgentTicketResponsesResponseSchema` (returns array of ticket responses/messages for machine context).
- [x] Create `AgentUpdateTicketStatusInputSchema` (validating status transition to `RESOLVED`).
- [x] Export all schemas and types from `packages/contracts/src/tickets/`.
**Verification:**
- [x] `npm run build:packages` succeeds with exit code 0.
**Dependencies:** None
**Files touched:**
- `packages/contracts/src/tickets/tickets.contract.ts`
- `packages/contracts/src/tickets/index.ts`
- `packages/contracts/src/index.ts`
**Estimated scope:** Small (3 files)

---

### Task 1.2: Implement Backend Routes & Controller Handlers in `ticket.routes.ts` & `TicketController.ts`
**Description:** Add endpoints `GET /api/v1/tickets/agent/active`, `GET /api/v1/tickets/:id/responses/agent`, and `PATCH /api/v1/tickets/:id/status/agent` protected by `agentAuthMiddleware`.
**Acceptance criteria:**
- [x] Implement `getActiveTicketForAgent(req, res)` in `TicketController.ts` querying latest open ticket linked to `req.agent.equipmentId`.
- [x] Implement `getResponsesForAgent(req, res)` in `TicketController.ts` returning conversation history.
- [x] Implement `updateStatusFromAgent(req, res)` in `TicketController.ts` transitioning ticket to `RESOLVED`.
- [x] Register routes in `server/src/modules/tickets/routes/ticket.routes.ts`.
**Verification:**
- [x] `npm -w server run build` succeeds with exit code 0.
**Dependencies:** Task 1.1
**Files touched:**
- `server/src/modules/tickets/routes/ticket.routes.ts`
- `server/src/modules/tickets/controllers/TicketController.ts`
- `server/src/modules/tickets/services/TicketQueryService.ts`
- `server/src/modules/tickets/services/TicketResponseService.ts`
- `server/src/modules/tickets/services/TicketStatusService.ts`
- `server/src/shared/middleware/gatewayTenantContextMiddleware.ts`
**Estimated scope:** Medium (6 files)

---

### Task 1.3: Add Backend Unit Tests for Agent Ticket Endpoints
**Description:** Implement unit tests verifying machine-authenticated active ticket retrieval, response history, and status update.
**Acceptance criteria:**
- [x] Unit test for `GET /api/v1/tickets/agent/active` with open ticket returning 200 and formatted payload.
- [x] Unit test for `GET /api/v1/tickets/agent/active` with no open ticket returning `{ success: true, data: null }`.
- [x] Unit test for `GET /api/v1/tickets/:id/responses/agent` returning messages array.
- [x] Unit test for `PATCH /api/v1/tickets/:id/status/agent` resolving ticket.
**Verification:**
- [x] `npm -w server test -- src/modules/tickets/services` passes 100%.
**Dependencies:** Task 1.2
**Files touched:**
- `server/src/modules/tickets/services/TicketQueryService.test.ts`
- `server/src/modules/tickets/services/TicketResponseService.test.ts`
- `server/src/modules/tickets/services/TicketStatusService.test.ts`
**Estimated scope:** Small (3 files)

---

## Checkpoint 1: Backend Contracts & Endpoints Green
- [x] `npm run build:packages` clean.
- [x] `npm -w server run build` clean.
- [x] Server ticket unit tests green (106/106 passed).

---

## Phase 2: Rust `msp-agent` Named Pipe IPC Server (`packages/msp-agent`)

### Task 2.1: Implement Named Pipe Server Module (`ipc_server.rs`) with Session 0 Security DACL
**Description:** Implement the Windows Named Pipe server in `packages/msp-agent` listening on `\\.\pipe\msp-agent-ipc` with a permissive Security Descriptor allowing non-elevated desktop sessions to connect.
**Acceptance criteria:**
- [x] Create `packages/msp-agent/src/ipc_server.rs` using `tokio::net::windows::named_pipe::ServerOptions`.
- [x] Configure Windows security attributes with SDDL string allowing Authenticated Users (`D:(A;;GRGW;;;AU)` or `D:(A;;GA;;;WD)`).
- [x] Implement framing with 4-byte big-endian length prefix encoding/decoding.
- [x] Spawn continuous client acceptance loop supporting concurrent pipe instances.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` succeeds.
**Dependencies:** Checkpoint 1
**Files touched:**
- `packages/msp-agent/src/ipc_server.rs`
- `packages/msp-agent/src/main.rs`
- `packages/msp-agent/Cargo.toml`
**Estimated scope:** Medium (3 files)

---

### Task 2.2: Implement IPC Request Handlers in `msp-agent`
**Description:** Handle incoming IPC requests from `msp-tray`: `GET_AGENT_STATUS`, `CREATE_TICKET`, `SEND_CHAT_MESSAGE`, `GET_ACTIVE_TICKET`, and `RESOLVE_TICKET`.
**Acceptance criteria:**
- [x] Dispatch `GET_AGENT_STATUS` returning current bound machine identity and online state.
- [x] Dispatch `CREATE_TICKET` collecting live hardware telemetry + top processes and calling backend `POST /api/v1/tickets/agent`.
- [x] Dispatch `SEND_CHAT_MESSAGE` calling `POST /api/v1/tickets/:id/responses/agent`.
- [x] Dispatch `GET_ACTIVE_TICKET` calling `GET /api/v1/tickets/agent/active`.
- [x] Dispatch `RESOLVE_TICKET` calling `PATCH /api/v1/tickets/:id/status/agent`.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` succeeds with exit code 0.
**Dependencies:** Task 2.1
**Files touched:**
- `packages/msp-agent/src/ipc_server.rs`
**Estimated scope:** Medium (1-2 files)

---

### Task 2.3: Wire Inbound WebSocket `TICKET_CHAT_PUSH` Broadcast to Connected Pipe Clients
**Description:** When `msp-agent` receives `TICKET_CHAT_PUSH` over the WebSocket connection from `AgentGateway`, broadcast it to all active named pipe client connections.
**Acceptance criteria:**
- [x] Create a `tokio::sync::broadcast` channel for outbound push notifications in `msp-agent`.
- [x] Handle `TICKET_CHAT_PUSH` command in `packages/msp-agent/src/main.rs` WebSocket loop and broadcast.
- [x] Each active named pipe client loop forwards broadcast frames down the pipe with 4-byte length framing.
**Verification:**
- [x] `cargo test --manifest-path packages/msp-agent/Cargo.toml` succeeds.
**Dependencies:** Task 2.2
**Files touched:**
- `packages/msp-agent/src/main.rs`
- `packages/msp-agent/src/ipc_server.rs`
**Estimated scope:** Small (2 files)

---

## Checkpoint 2: `msp-agent` Compiles and Local Tests Pass
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` clean.
- [x] All `msp-agent` tests pass.

---

## Phase 3: Rust `msp-tray` Named Pipe IPC Client (`packages/msp-tray`)

### Task 3.1: Implement Resilient Named Pipe Client with Auto-Reconnect in `packages/msp-tray`
**Description:** Implement async named pipe client in `packages/msp-tray/src-tauri/src/ipc.rs` connecting to `\\.\pipe\msp-agent-ipc` with exponential backoff and background push listener.
**Acceptance criteria:**
- [x] Implement `IpcClient` managing connection to `\\.\pipe\msp-agent-ipc`.
- [x] Spawn background task reading incoming server frames (handling `TICKET_CHAT_PUSH`).
- [x] Implement request-response multiplexing over pipe with correlation IDs.
- [x] Auto-reconnect with backoff if pipe is closed or agent restarts.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` succeeds.
**Dependencies:** Checkpoint 2
**Files touched:**
- `packages/msp-tray/src-tauri/src/ipc.rs`
- `packages/msp-tray/src-tauri/Cargo.toml`
**Estimated scope:** Medium (2 files)

---

### Task 3.2: Wire IPC Client to Tauri Commands & Window Push Event Dispatch in `lib.rs`
**Description:** Update `lib.rs` Tauri commands (`create_ticket`, `send_chat_message`, `get_active_ticket`, `get_agent_status`, `resolve_ticket`) to delegate directly to the IPC client and forward push events to the webview window.
**Acceptance criteria:**
- [x] `create_ticket` invokes IPC `CREATE_TICKET` and stores created ticket in `AppState`.
- [x] `send_chat_message` invokes IPC `SEND_CHAT_MESSAGE`.
- [x] `get_active_ticket` queries IPC `GET_ACTIVE_TICKET` and syncs `AppState`.
- [x] `get_agent_status` queries IPC `GET_AGENT_STATUS`.
- [x] `resolve_ticket` invokes IPC `RESOLVE_TICKET`.
- [x] When `TICKET_CHAT_PUSH` arrives over pipe, emit `ticket_chat_push` to the webview window using `app_handle.emit`.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` succeeds.
**Dependencies:** Task 3.1
**Files touched:**
- `packages/msp-tray/src-tauri/src/lib.rs`
**Estimated scope:** Medium (1-2 files)

---

## Checkpoint 3: `msp-tray` Rust Backend Compiles and Connects to Pipe
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` clean.
- [x] All Tauri command bindings compile without errors.

---

## Phase 4: Frontend UI Hydration & Real-Time Sync (`packages/msp-tray/src`)

### Task 4.1: Hydrate Past Message History on Ticket Mount in `LiveChatDrawer.tsx`
**Description:** Update `LiveChatDrawer.tsx` to fetch past message history for the active ticket upon mount, merging with existing local state.
**Acceptance criteria:**
- [x] Add `fetchTicketMessages(ticketId)` to `tauri.ts`.
- [x] On ticket mount in `LiveChatDrawer.tsx`, fetch past responses and populate `messages` list.
- [x] Ensure real-time `ticket_chat_push` listener deduplicates messages by `responseId` or timestamp.
**Verification:**
- [x] `npm --prefix packages/msp-tray run build` compiles with 0 errors.
**Dependencies:** Checkpoint 3
**Files touched:**
- `packages/msp-tray/src/services/tauri.ts`
- `packages/msp-tray/src/components/LiveChatDrawer.tsx`
**Estimated scope:** Small (2 files)

---

### Task 4.2: Auto-Sync Active Ticket and Status Transitions in `App.tsx`
**Description:** Update polling and lifecycle in `App.tsx` to refresh `activeTicket` state periodically and update connection status indicator based on IPC health.
**Acceptance criteria:**
- [x] Periodic timer refreshes both hardware vitals and agent status / active ticket.
- [x] Header online indicator reflects `ipcConnected` and `cloudConnected`.
- [x] Ticket resolution updates UI state immediately and re-enables 1-click issue reporting card.
**Verification:**
- [x] `npm --prefix packages/msp-tray run build` succeeds with exit code 0.
**Dependencies:** Task 4.1
**Files touched:**
- `packages/msp-tray/src/App.tsx`
- `packages/msp-tray/src/components/Header.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 4: Full End-to-End Verification & Quality Gates
- [x] `npm run build:packages` clean.
- [x] `npm -w server run build` clean.
- [x] `npm --prefix packages/msp-tray run build` clean.
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` clean.
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` clean.
- [x] All server unit tests pass.
