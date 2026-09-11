# Implementation Plan: Workstation Activation Gate for MSP Endpoint Suite

## Overview
Eliminate end-user confusion and silent `403 Forbidden` API errors on freshly installed endpoints by implementing an **Activation Gatekeeper** across `msp-agent` and `msp-tray`. When a newly installed machine is unbound, `msp-tray` clearly displays its live 6-digit pairing PIN, TTL countdown, and copy/refresh controls, while gating ticket creation until an administrator claims the slot in the MSP Portal. Upon claim, the agent broadcasts an `AGENT_BOUND` event over IPC, triggering immediate, seamless unlocking with sound confirmation.

---

## Architecture Decisions

1. **Named Pipe IPC Contract Enrichment (`packages/msp-agent`):**
   - Extend `GET_AGENT_STATUS` response payload to include `isBound: bool`, `pairingCode: Option<String>`, and `pairingCodeExpiresAt: Option<String>`.
   - Add `REFRESH_PAIRING_CODE` IPC request handler so the desktop companion can trigger code re-issuance without restarting the background service.

2. **Real-Time Push Handshake on Binding (`packages/msp-agent` -> `packages/msp-tray`):**
   - Upon receiving and persisting the server's `BIND` WebSocket frame in `handle_bind()`, `msp-agent` immediately broadcasts an `AGENT_BOUND` event frame down all active named pipe client instances (`\\.\pipe\msp-agent-ipc`).
   - `msp-tray` listens for this event via Tauri async event bridge, playing `playNotificationChime()` and immediately swapping the gate for the active support workspace.

3. **Zero-Trust UI Gating (`packages/msp-tray`):**
   - When `agentStatus.isBound === false`, `App.tsx` conditionally renders `<ActivationGate />` in place of the normal support and ticket submission interface.
   - Suppresses shortcut keys / quick-ticket popups while unbound, preventing end users from triggering unauthenticated `403` API failures.

4. **Self-Contained Expiration & Refresh Flow:**
   - `<ActivationGate />` calculates remaining TTL from `pairingCodeExpiresAt` with an animated countdown badge.
   - When expired or upon user request, the "Refresh Code" button invokes `refreshPairingCode()` over Tauri IPC to retrieve a fresh code seamlessly.

---

## Risk Analysis & Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Race condition where agent binds while tray is closed or starting up | Low | `GET_AGENT_STATUS` on startup always reads current `AgentState`, so tray will detect bound state immediately on launch. |
| Non-admin user permissions on Windows named pipe | Medium | Named pipe security descriptor (`D:(A;;GA;;;WD)`) in `ipc_server.rs` allows Authenticated Users and Everyone to read/write IPC frames. |
| Timezone discrepancies in TTL countdown | Low | Transmit RFC 3339 UTC timestamps (`expires_at`) from agent and calculate relative delta client-side. |

---

## Task Breakdown Index

### Phase 1: Agent IPC & Binding Event Bus
- [x] Task 1.1: Enhance Agent IPC Status & Refresh Protocol (`packages/msp-agent`)
- [x] Task 1.2: Broadcast `AGENT_BOUND` down IPC Named Pipe (`packages/msp-agent`)
- **Checkpoint: Agent Protocol Ready**

### Phase 2: Tray Tauri IPC Client & Service Types
- [x] Task 2.1: Update Tauri Rust IPC Models & Refresh Command (`packages/msp-tray`)
- [x] Task 2.2: TypeScript Service Types & Event Listeners (`packages/msp-tray`)
- **Checkpoint: Tray IPC Layer Tested**

### Phase 3: Tray UI Activation Gate & App Integration
- [x] Task 3.1: Build `<ActivationGate />` Component (`packages/msp-tray`)
- [x] Task 3.2: Integrate Gate & Dynamic Unlocking in `App.tsx` (`packages/msp-tray`)
- **Checkpoint: Frontend Integration Complete**

### Phase 4: Verification & End-to-End Validation
- [x] Task 4.1: Rust Agent Unit Tests & Compilation
- [x] Task 4.2: Tray Application Build & Workspace Quality Gates
- **Checkpoint: Feature Complete**
