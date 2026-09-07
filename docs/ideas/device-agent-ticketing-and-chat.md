# Concept: Endpoint No-Login Ticket Creation & Real-Time Tray Chat

## Status
Approved & Implemented (Formalized in [ADR-005](../decisions/ADR-005-endpoint-agent-no-login-ticketing-and-realtime-chat.md) & [IPC Specification](../architecture/endpoint-tray-ipc-specification.md))

## Date
2026-09-07

---

## 1. Problem Statement
Workstation end-users frequently suffer from IT issues (application crashes, printing failures, network drops, performance degradation) but avoid or delay reporting them because logging into the web portal requires:
1. Remembering login credentials or completing OTP email handshakes.
2. Navigating away from their active workflow to open a browser window.
3. Manually typing out ambiguous error descriptions without hardware diagnostics or logs.

Furthermore, traditional ticketing communication relies on email threads, which introduce hours of communication latency for urgent workstation incidents. 

**How might we enable physical workstations and end-users to create tickets and converse with assigned MSP technicians in real time directly from a desktop system tray widget without portal logins, while ensuring tenant isolation, identity attribution, and quota integrity?**

---

## 2. Recommended Direction: Machine-Bound Tray Assistant & WebSocket Live Chat

We establish a dedicated endpoint support pipeline consisting of a machine-authenticated ticket ingestion API and an interactive desktop tray chat drawer connected to the MSP backend over the existing `AgentGateway` WebSocket infrastructure.

```
┌─────────────────────────────────────────────────────────────┐
│                       MSP Web Portal                        │
│             (features/tickets/TicketDetailPage.tsx)         │
│  [Technician types message] ──> POST /api/v1/tickets/:id/responses
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Backend Server                   │
│  1. Stores message in PostgreSQL `ticket_responses`         │
│  2. Resolves equipment_id and tenant_id from ticket         │
│  3. AgentGateway.sendToAgent(equipmentId, {                 │
│       type: 'TICKET_CHAT_PUSH',                             │
│       ticketId, message, authorName, createdAt              │
│     })                                                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Endpoint Windows Machine                  │
│  1. msp-agent.exe (Service - Session 0) receives WS frame   │
│  2. Named Pipe IPC forward to msp-tray.exe (User Session)   │
│  3. System Tray Chat Flyout pops up with unread badge       │
│  4. User types reply or pastes screenshot                   │
│  5. Sends via POST /api/v1/tickets/:id/responses/agent      │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Identity & Shift-Worker Attribution
* Workstations are bound to a tenant and equipment slot via machine-level `agentToken`.
* On the first issue report or chat message, the tray widget prompts the active desk user for their **Name and Email** (e.g., *"Sarah Jenkins - sarah@client.corp"*).
* This identity is cached locally per Windows user profile (`%LOCALAPPDATA%`) and attached to all subsequent ticket interactions, ensuring shift workers sharing the same physical terminal are accurately attributed.

### 2.2 Instant 1-Click Ticket Creation (`POST /api/v1/tickets/agent`)
* The desktop tray app provides a lightweight **"Report Issue to IT"** modal:
  * **User Identity:** Name & Email (pre-filled after first use).
  * **Category Selector:** Quick tiles (*Computer Slow / Frozen*, *Network & Printing*, *Application Crash*, *Security Concern*, *Other*).
  * **Description:** Plain text problem note.
  * **Flight Recorder Snapshot:** The background agent automatically captures and attaches:
    * OS build version, uptime, and pending Windows updates.
    * CPU & RAM utilization at the moment of report.
    * Top 5 resource-consuming processes.
    * Last 3 critical Windows Event Log errors (Application / System).
  * **Opt-in Screenshot:** Checkbox to attach active monitor screenshot or clipboard snip.
* The endpoint validates quota against [`BL-201`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L64) (Feature Quota) and auto-assigns a technician via [`BL-102`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L61) (Round-Robin Dispatch).

### 2.3 Live System Tray Chat Drawer
* Once a ticket is opened, the tray icon transitions into an active support state with a docked chat drawer (360×480px) mirroring the layout of [`TicketResponses.tsx`](file:///c:/Users/PC/Workspace/msp_client_portal/client/src/features/tickets/components/TicketResponses.tsx):
  * **Message Stream:** Distinct bubbles for technician, end-user, and automated agent diagnostic milestones.
  * **Zero-Latency Relay:** Inbound technician replies are pushed down to the workstation in `< 100ms` over the existing `AgentGateway` WebSocket connection.
  * **Screenshot Clipboard Paste (`Ctrl+V`):** Users can capture an error with `Win + Shift + S` and paste directly into the chat input box.
  * **Resolution Confirmation:** When the issue is fixed, the user can click a **"Mark as Resolved"** button directly in the tray drawer, transitioning the ticket to `RESOLVED` without administrative friction.

---

## 3. Key Assumptions & Constraints

1. **Session 0 vs User Desktop Isolation:**
   * The Windows Service runs under `NT AUTHORITY\SYSTEM` in Session 0 and cannot present desktop windows to interactive users.
   * *Architecture:* The solution requires a two-process architecture:
     * `msp-agent.exe` (Background Windows Service managing WebSocket and telemetry).
     * `msp-tray.exe` (Lightweight user-session tray application communicating with `msp-agent` via local Named Pipe IPC `\\.\pipe\msp-agent-ipc`).
2. **Quota & Anti-Abuse Integrity ([`BL-201`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L64)):**
   * Endpoint-created tickets consume the tenant's monthly quota and are subject to rate limiting (maximum 3 endpoint tickets per hour per device) to prevent accidental spam loops.
3. **Zero-Standing Privilege (ZSP) Security:**
   * The `agentToken` is restricted: it can only create tickets for its own `equipment_id` and can only view/append chat responses to active tickets belonging to that exact physical endpoint.

---

## 4. MVP Scope

### In Scope
- **Backend API Routes & Contracts:**
  - `POST /api/v1/tickets/agent`: Machine-authenticated endpoint to create a ticket with attached hardware telemetry and user contact details.
  - `POST /api/v1/tickets/:id/responses/agent`: Machine-authenticated endpoint to append responses and upload attachments to active tickets.
  - `AgentGateway` frame handler: `TICKET_CHAT_PUSH` broadcast from server to client WebSocket socket when technician replies.
- **Frontend Portal Alignment:**
  - Support ticket details view [`TicketDetailPage.tsx`](file:///c:/Users/PC/Workspace/msp_client_portal/client/src/features/tickets/pages/TicketDetailPage.tsx) marks endpoint-submitted tickets with an `[Endpoint Agent]` badge and shows the attached hardware flight recorder card.
- **Desktop Agent & Tray Helper (`msp-agent` + `msp-tray`):**
  - Prompt for Name/Email on first run.
  - Tray icon with "Report Issue" dialog.
  - Docked chat flyout with real-time incoming push notification chime.
  - Clipboard screenshot paste (`Ctrl+V`).
  - 1-click "Mark as Resolved" button.

### Not Doing (and Why)
- **1-5 Star CSAT Feedback Rating Dialog:** Excluded per product decision to keep the resolution loop distraction-free.
- **Anonymous / Unpaired Device Tickets:** Excluded because every device must belong to a verified tenant equipment slot to maintain multi-tenant security boundaries and billing entitlements.
- **Voice / Video Call Escalation:** Excluded to avoid WebRTC network negotiation complexity; technicians already have remote desktop and command execution via RMM.
- **Full Historical Ticket Search in Tray:** Excluded to keep the desktop client lightweight; users can view historical archives in the web portal.

---

## 5. Architectural Implementation Slices

### Slice 1: Backend Contracts & Agent Ticket Endpoints
1. Define `CreateAgentTicketInputSchema` and `CreateAgentTicketResponseSchema` in `packages/contracts/src/tickets/`.
2. Implement `TicketController.createFromAgent` and `TicketController.addResponseFromAgent` in `server/src/modules/tickets/`.
3. Add `AgentGateway.pushTicketChatMessage(equipmentId, payload)` to broadcast responses over the active WebSocket channel.

### Slice 2: Web Portal Visibility & Dispatch Integration
1. In `TicketDetailPage.tsx`, display the endpoint user attribution (*"Reported by Sarah Jenkins via Desktop Agent"*) and hardware telemetry widget.
2. Ensure round-robin technician dispatch ([`BL-102`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L61)) assigns an active specialist immediately upon ticket creation.

### Slice 3: Endpoint Tray Client & IPC Bridge
1. Build `msp-tray` system tray utility with local Named Pipe communication to `msp-agent`.
2. Implement the compact chat drawer UI with unread badge counter, message list, screenshot paste handler, and resolution button.
