# Implementation Plan: MSP Tray to MSP Agent Named Pipe IPC Bridge

## Overview
Implement a high-performance local Inter-Process Communication (IPC) bridge over Windows Named Pipes (`\\.\pipe\msp-agent-ipc`) connecting the desktop tray user interface (`msp-tray.exe`, Session 1+) to the background system daemon (`msp-agent.exe`, Windows Service Session 0). This eliminates local authentication management in `msp-tray`, enabling zero-config automatic ticket creation, real-time bidirectional support chat push, and workstation ticket synchronization.

---

## Architecture Decisions

1. **Windows Named Pipe IPC (`\\.\pipe\msp-agent-ipc`):**
   - Direct, low-latency, zero-network kernel IPC between the system daemon and desk user app.
   - **Security Descriptor (DACL):** Server pipe configured with explicit SDDL `D:(A;;GRGW;;;AU)` (Allow GenericRead + GenericWrite to Authenticated Users) ensuring unprivileged desktop sessions can connect to the Session 0 SYSTEM service.
   - **Framing:** 4-byte big-endian length prefix + UTF-8 JSON `IpcEnvelope<T>`.

2. **Backend Machine-Authenticated Contract Extensions:**
   - Add `GET /api/v1/tickets/agent/active` to query current open ticket for the authenticated workstation.
   - Add `GET /api/v1/tickets/:id/responses/agent` to fetch conversational history for the ticket.
   - Add `PATCH /api/v1/tickets/:id/status/agent` to allow desk user to mark the ticket `RESOLVED` directly from the tray.
   - All protected by existing `agentAuthMiddleware` validating against `subscription_equipment.agent_token`.

3. **Event Push Brokerage:**
   - When a technician replies in the web portal, `AgentGateway` sends `TICKET_CHAT_PUSH` over the existing WebSocket (`/agent-ws`).
   - `msp-agent` receives the frame and broadcasts it across active connected named pipe instances.
   - `msp-tray` receives the frame over the pipe and emits it as a Tauri window event (`ticket_chat_push`), playing the chime and rendering the reply.

---

## Task List

### Phase 1: Backend Machine-Authenticated Endpoints & Contracts
- [ ] Task 1.1: Define Agent Active Ticket & History Contracts in `@shared/contracts`
- [ ] Task 1.2: Implement Backend Routes & Controller Handlers in `ticket.routes.ts` & `TicketController.ts`
- [ ] Task 1.3: Add Backend Unit Tests in `ticket.routes.test.ts` / `TicketController.test.ts`
- [ ] Checkpoint 1: Backend Contracts & Endpoints Green

### Phase 2: Rust `msp-agent` Named Pipe IPC Server (`packages/msp-agent`)
- [ ] Task 2.1: Implement Named Pipe Server Module (`ipc_server.rs`) with Session 0 Security DACL
- [ ] Task 2.2: Implement IPC Request Handlers (`GET_AGENT_STATUS`, `CREATE_TICKET`, `SEND_CHAT_MESSAGE`, `GET_ACTIVE_TICKET`, `RESOLVE_TICKET`)
- [ ] Task 2.3: Wire Inbound WebSocket `TICKET_CHAT_PUSH` Broadcast to Connected Pipe Clients
- [ ] Checkpoint 2: `msp-agent` Compiles and Local Tests Pass

### Phase 3: Rust `msp-tray` Named Pipe IPC Client (`packages/msp-tray`)
- [ ] Task 3.1: Implement Resilient Named Pipe Client with Auto-Reconnect in `packages/msp-tray/src-tauri/src/ipc.rs`
- [ ] Task 3.2: Wire IPC Client to Tauri Commands & Window Push Event Dispatch in `lib.rs`
- [ ] Checkpoint 3: `msp-tray` Rust Backend Compiles and Connects to Pipe

### Phase 4: Frontend UI Hydration & Real-Time Sync (`packages/msp-tray/src`)
- [ ] Task 4.1: Hydrate Past Message History on Ticket Mount in `LiveChatDrawer.tsx`
- [ ] Task 4.2: Auto-Sync Active Ticket and Status Transitions in `App.tsx`
- [ ] Checkpoint 4: Full End-to-End Verification & Quality Gates

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Windows Session 0 Pipe Security (Access Denied):** Standard user unable to open pipe created by SYSTEM service. | Critical | Server pipe explicitly created with SDDL `D:(A;;GRGW;;;AU)` or security descriptor allowing Authenticated Users access. |
| **Daemon Restart / Disconnect:** Agent service restarts during update, leaving tray disconnected. | Medium | Tray client implements exponential backoff reconnection loop and displays reconnecting badge in Header. |
| **Pipe Buffer Saturation:** Slow tray app blocking agent WebSocket message loop. | Low | Agent uses asynchronous broadcast channel (`tokio::sync::broadcast`) with bounded buffer and drops for stale clients. |

---

## Open Questions
- None. Requirements and architectural direction validated with user.
