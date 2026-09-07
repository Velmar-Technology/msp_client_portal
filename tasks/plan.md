# Implementation Plan: Endpoint No-Login Ticket Creation & Real-Time Tray Chat

## Overview
Implement machine-authenticated endpoint ticket creation and live WebSocket chat integration for workstation devices. Allows physical endpoints running the MSP agent to create pre-diagnosed tickets without requiring web portal logins, while providing a real-time system tray chat drawer synchronized with technician responses in `TicketDetailPage.tsx` over the existing `AgentGateway` WebSocket connection.

---

## Architecture Decisions

1. **Machine-Level Authentication (`agentToken`):**
   - The desktop agent authenticates using the hardware token (`subscription_equipment.agent_token`) issued during OTP pairing.
   - `agentAuthMiddleware` validates the token, joins `subscription_equipment` with `subscriptions`, and extracts `equipment_id`, `tenant_id`, and `client_id` (the client account owner).
   - Enforces Zero-Standing Privilege (ZSP): endpoints can only create tickets bound to their own `equipment_id` and can only view/reply to active tickets belonging to that device.

2. **Shift-Worker Attribution & Contact Identity:**
   - Desktop tray prompts for the active desk worker's Name and Email on first issue report.
   - Stored in `tickets.reporter_name` and `tickets.reporter_email`, enabling shift workers on shared physical workstations to be accurately identified.

3. **Flight Recorder Diagnostics Snapshot:**
   - At the time of ticket submission, the agent collects OS build, uptime, CPU%, RAM%, disk%, top 5 processes, and recent critical Windows event log entries.
   - Stored in a structured JSONB column `tickets.device_snapshot` and presented in the portal's `TicketDetailPage.tsx` as a collapsible diagnostic card.

4. **Zero-Latency Push via `AgentGateway` WebSocket:**
   - When a technician replies to a ticket in `TicketDetailPage.tsx` (`POST /api/v1/tickets/:id/responses`), the backend checks if the ticket has an `equipment_id`.
   - If the device is connected to `AgentGateway`, the server broadcasts a `TICKET_CHAT_PUSH` JSON frame down to the endpoint WebSocket socket in $< 100\text{ms}$.
   - The user-mode desktop tray client (`msp-tray` built with Tauri v2) receives the frame over local Named Pipe / UDS IPC and alerts the user with an unread badge and chime.

5. **Two-Process Architecture (`msp-agent` + `msp-tray` Tauri v2):**
   - Headless Rust daemon (`packages/msp-agent`) runs 24/7 as a system service for background RMM telemetry and network sockets.
   - Interactive companion (`packages/msp-tray`) runs in user session using Tauri v2, sharing our React / Tailwind design system.
   - Fully detailed in [`docs/ideas/tauri-cross-platform-endpoint-tray.md`](file:///c:/Users/PC/Workspace/msp_client_portal/docs/ideas/tauri-cross-platform-endpoint-tray.md).

6. **Quota & State Machine Compliance:**
   - Enforces [`BL-201`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L64) ticket quota check against the tenant's subscription plan.
   - Enforces [`BL-102`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L61) Round-Robin Dispatch to immediately assign an active technician specialist.
   - Device users can mark their ticket as `RESOLVED` directly from the tray without CSAT popups (per approved concept).

---

## Dependency Graph

```
Phase 1: Database Schema & Shared Contracts
   ├── 1.1 Migration 042: Add reporter & device_snapshot to tickets
   ├── 1.2 Update Drizzle schema & shared domain types
   ├── 1.3 Add Agent Ticket contracts in @shared/contracts
   └── Checkpoint 1: Database schema & contracts compile clean
          │
          ▼
Phase 2: Backend Ingestion, Security & WebSocket Push
   ├── 2.1 Implement agentAuthMiddleware & ZSP token validation
   ├── 2.2 Implement TicketService.createFromAgent (BL-201 & BL-102)
   ├── 2.3 Implement TicketService.addResponseFromAgent & Chat Routes
   ├── 2.4 Implement AgentGateway.pushTicketChatMessage WebSocket relay
   └── Checkpoint 2: Backend unit & integration tests pass (100% green)
          │
          ▼
Phase 3: Web Portal UI Enhancements
   ├── 3.1 Display Endpoint Badge & Flight Recorder in TicketDetailPage
   ├── 3.2 Display Reporter Attribution in TicketResponses thread
   ├── 3.3 Bilingual translations in en_US.json and es_DO.json
   └── Checkpoint 3: Frontend build and Vitest suite pass cleanly
          │
          ▼
Phase 4: Agent Test Harness & Tray IPC Protocol
   ├── 4.1 Create test-agent-ticketing harness simulating socket & chat
   ├── 4.2 Document Named Pipe IPC contract for msp-tray.exe
   └── Checkpoint 4: End-to-end simulated agent flow verified
          │
          ▼
Phase 5: Quality Gates & Verification
   ├── 5.1 Full workspace typecheck & build
   ├── 5.2 Full test suites (server + client)
   └── Checkpoint 5: Definition of Done verified
```

---

## Task List

### Phase 1: Database Schema & Shared Contracts
- [x] Task 1.1: Database Migration `042_add_ticket_reporter_and_agent_metadata.sql`
- [x] Task 1.2: Update Drizzle Schema & Shared Domain Types
- [x] Task 1.3: Define Agent Ticket Contracts in `@shared/contracts`
- [x] Checkpoint 1: Contracts & Database Schema Active

### Phase 2: Backend Ingestion, Security & WebSocket Push
- [x] Task 2.1: Implement `agentAuthMiddleware` for Machine-Bound Token Validation
- [x] Task 2.2: Implement `TicketService.createFromAgent` with BL-201 & BL-102
- [x] Task 2.3: Implement `TicketService.addResponseFromAgent` & Express Agent Routes
- [x] Task 2.4: Implement `AgentGateway.pushTicketChatMessage` WebSocket Relay
- [x] Checkpoint 2: Backend Ingestion & Push Logic Verified

### Phase 3: Web Portal UI Enhancements
- [x] Task 3.1: Add Endpoint Flight Recorder Telemetry Card to `TicketDetailPage`
- [x] Task 3.2: Render Reporter Identity in `TicketResponses` Component
- [x] Task 3.3: Add Bilingual Localization in `en_US.json` and `es_DO.json`
- [x] Checkpoint 3: Frontend Portal UI Verified

### Phase 4: Agent Test Harness & Tray IPC Protocol
- [x] Task 4.1: Create Automated Agent Ticketing & Chat Test Harness
- [x] Task 4.2: Document Named Pipe IPC Protocol for `msp-tray.exe`
- [x] Checkpoint 4: Integration Simulation Cleared

### Phase 5: Quality Gates & DoD (Completed in ec2c876 & ab40b22)
- [x] Task 5.1: Run Full Test Suites (`npm -w server run test` & `npm -w client run test:run`)
- [x] Task 5.2: Monorepo Clean Compilation (`npm run build:packages`, `server build`, `client build`)
- [x] Checkpoint 5: Final DoD Verified

### Phase 6: Tauri v2 Desktop Companion (`packages/msp-tray`)
- [x] Task 6.1: Scaffold `packages/msp-tray` workspace with Tauri v2 + React 19 + Tailwind CSS
- [x] Task 6.2: Implement Local IPC Transport & Tauri Commands (`src-tauri/src/ipc.rs`)
- [x] Task 6.3: Implement Shift-Worker Attribution & Local Persistence
- [x] Task 6.4: Implement Tray Drawer & 1-Click Ticket Creation Modal
- [x] Task 6.5: Implement Live Chat Drawer Mirroring `TicketResponses.tsx`
- [x] Task 6.6: Compilation, Build Verification & Integration Testing
- [x] Checkpoint 6: Tauri Desktop Assistant Operational


---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Unpaired Agent Exploits:** Malicious requests attempting to spoof `agentToken`. | High | `agentAuthMiddleware` strictly queries `subscription_equipment` for matching `agent_token` and verified `ACTIVE` status. |
| **Ticket Quota Exhaustion (`BL-201`):** Rogue device scripts flooding the ticketing API. | Medium | Enforces `ticketQuotaService.enforceTicketLimit` before creation plus IP/token rate-limiting (max 3 tickets/hr/device). |
| **Session 0 UI Inaccessibility:** Windows service unable to display tray windows. | Medium | Two-process architecture: Session 0 `msp-agent` delegates UI to user-session `msp-tray` via Named Pipe. |
| **Offline Workstation Socket Disconnects:** Technician responds when workstation is sleeping or disconnected. | Low | Message is stored durably in `ticket_responses`; agent retrieves unread responses upon WebSocket reconnection. |

---

## Open Questions
All initial open questions have been resolved:
- CSAT feedback prompt: **Disabled** (distraction-free resolution).
- Multi-user shift workstation attribution: **Prompts for Name and Email** on first run, cached per user profile.
