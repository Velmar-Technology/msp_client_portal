# Idea Refinement: Zero-Config Named Pipe Link (msp-tray <-> msp-agent)

## Problem Statement
How might we turn the already-running `msp-agent` service daemon into a local named-pipe broker so that `msp-tray` gains instant, zero-config access to backend ticketing and bidirectional chat without managing its own tokens or cloud connections?

## Recommended Direction: Daemon IPC Broker Pattern
Instead of `msp-tray` opening its own HTTP/WebSocket connections to the cloud, **`msp-agent` acts as the single authenticated gateway for the physical workstation**:

- **Zero-Configuration UX:** When the MSP deploys `msp-agent.exe` to a workstation, `msp-tray.exe` automatically works without asking desk users for tokens, passwords, or server URLs.
- **Single Authenticated Pipe:** All machine telemetry (CPU, RAM, active processes, event logs) is already collected with `SYSTEM` privileges by `msp-agent`. When `msp-tray` submits a ticket, `msp-agent` attaches genuine flight-recorder telemetry directly to the payload.
- **True Real-Time Push Delivery:** When a technician in the portal replies, the backend's `TICKET_CHAT_PUSH` WebSocket frame arrives at `msp-agent`, which immediately forwards it across `\\.\pipe\msp-agent-ipc` to `msp-tray`, triggering the in-app chime and updating the live drawer in real time.

## Key Assumptions to Validate
- [ ] **Windows Pipe DACL (Cross-Session Access):** Pipe created by `msp-agent` under `SYSTEM` (Session 0) must specify SDDL `D:(A;;GRGW;;;AU)` (Authenticated Users) or `D:(A;;GA;;;WD)` (Everyone) so that `msp-tray` running under unprivileged standard user in Session 1+ can connect.
- [ ] **Connection Lifecycle & Reconnects:** If `msp-agent` restarts (e.g. during an autonomous binary upgrade), `msp-tray` must back off and re-establish the named pipe client automatically.
- [ ] **State Synchronization on Reconnect:** When `msp-tray` launches after a ticket was already opened, querying `GET_ACTIVE_TICKET` across the pipe will immediately hydrate the UI with open ticket status and previous chat messages.

## MVP Scope
1. **`msp-agent` Pipe Server (`ipc_server.rs`):**
   - Implements a Windows Named Pipe listener on `\\.\pipe\msp-agent-ipc`.
   - Handles 4 core IPC envelopes:
     - `GET_AGENT_STATUS`: Returns current slot identity, hostname, tenant name, and cloud connection health.
     - `CREATE_TICKET`: Injects local machine telemetry and submits via existing authenticated agent gateway or backend HTTP endpoint using stored slot token.
     - `SEND_CHAT_MESSAGE`: Dispatches ticket response to cloud backend using agent token.
     - `GET_ACTIVE_TICKET`: Queries active open ticket & message history for this machine.
   - Forwards inbound `TICKET_CHAT_PUSH` frames received from the gateway WebSocket to all connected pipe clients.
2. **`msp-tray` Pipe Client:**
   - In `packages/msp-tray/src-tauri/src/ipc.rs`: Wire up `encode_frame` / `decode_frame` to connect to `\\.\pipe\msp-agent-ipc`.
   - In `lib.rs`: Delegate `create_ticket`, `get_agent_status`, and `send_chat_message` commands to the pipe.
   - Forward pipe push events to the frontend via Tauri's `app_handle.emit("ticket_chat_push", payload)`.

## Not Doing (and Why)
- **Not opening a local TCP/HTTP port (e.g. `127.0.0.1:4880`):** Avoids Windows Defender Firewall prompts and port collision risks. Named pipes provide kernel-level ACLs.
- **Not maintaining dual WebSocket connections:** Eliminates duplicate heartbeats, connection slot consumption, and conflicting telemetry.
- **Not storing or asking for user passwords:** Complies strictly with BL-205 (Device-Bound Credentials) and shift-worker attribution.
