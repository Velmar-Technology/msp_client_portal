# ADR-005: Endpoint Agent No-Login Ticketing, Diagnostic Flight Recorder & Real-Time Tray Chat

## Status
Accepted

## Date
2026-09-07

## Context
In MSP operations, end-users at client endpoints frequently encounter technical hurdles (freezing applications, network outages, printer driver faults, or peripheral failures). The traditional approach of requiring desk users to navigate to a web portal, remember login credentials, and manually describe hardware/software symptoms introduces severe operational friction:

1. **Portal Authentication Friction:** Many desk workers (especially in medical clinics, retail counters, shift warehouses, and school labs) do not possess individual portal logins or have forgotten their credentials. When an issue occurs, they resort to unrecorded phone calls, emails, or walking up to office managers.
2. **Lack of Immediate Diagnostic Context:** When a user opens a ticket stating "computer is slow" or "software crashed", technicians lose significant time requesting basic diagnostic details: OS version, system uptime, memory pressure, active window context, and recent event log faults.
3. **Shift-Worker & Shared Terminal Anonymity:** Multiple employees frequently share the same physical computer under a generic local or Active Directory profile (e.g., `cashier`, `reception`, `lab`). Ticketing systems that rely solely on system usernames fail to attribute who actually experienced and reported the issue.
4. **Asynchronous Communication Delay:** Web portal ticket threads and email responses introduce long latency loops. Users expect instant, real-time messaging from their desktop taskbar without context switching away from their active work environment.

We needed a unified, machine-authenticated architectural pattern that enables physical workstations to report pre-diagnosed tickets without web portal logins, accurately attributes rotating desk users, and synchronizes real-time technician responses down to a system tray chat flyout in $< 100\text{ms}$.

---

## Decision

We adopt an integrated **Endpoint Agent Ticketing & Real-Time Chat** architecture across the monorepo, paired with a **Two-Process Desktop Model**:

### 1. Two-Process Architecture (`msp-agent` + `msp-tray` Tauri v2)
* **`packages/msp-agent` (Headless Rust Daemon):** Runs 24/7 as an elevated background service (`LocalSystem` on Windows, `root` daemon on Linux/macOS). Manages background RMM telemetry, remote PowerShell command execution, hardware metric sampling, and the persistent cloud WebSocket socket (`AgentGateway`). Protects the workstation machine secret (`agent_token`).
* **`packages/msp-tray` (Tauri v2 Desktop Assistant):** Runs in the active user's interactive desktop session (Session 1+). Lives in the system tray / notification area, providing an instant 1-click issue reporting dialog, screenshot snip paste, and a real-time ticket chat drawer mirroring `TicketDetailPage.tsx`.
* **Local IPC Transport:** The tray communicates with the daemon locally via length-prefixed JSON frames across Windows Named Pipes (`\\.\pipe\msp-agent-ipc`) or Unix Domain Sockets (`/var/run/msp-agent.sock`), enforcing strict DACL security.

### 2. Machine Token Authentication & Zero Standing Privilege (ZSP)
* Physical workstations authenticate using the hardware token (`subscription_equipment.agent_token`) provisioned during OTP activation.
* `agentAuthMiddleware` intercepts incoming `Authorization: Bearer <agentToken>` headers, joins `subscription_equipment` with `subscriptions`, and injects the authenticated `AgentPayload` (`equipmentId`, `tenantId`, `clientId`, `hostname`) into Express requests.
* Endpoints operate under strict Zero-Standing Privilege (ZSP):
  * Endpoints can only create tickets bound to their own `equipment_id` and `tenant_id`.
  * Endpoints can only view or reply to active tickets originating from that physical terminal.

### 3. Shift-Worker Attribution & Profile Caching
* On first ticket submission or message dispatch, the tray app prompts for the desk worker's **Name and Email** (*"Sarah Jenkins <sarah@client.corp>"*).
* This identity is cached per-user in `%LOCALAPPDATA%\VelmarMSP\attribution.json` and attached to all ticket operations.
* Stored in database columns `tickets.reporter_name`, `tickets.reporter_email`, and `ticket_responses.author_name`, allowing technicians to know exactly who is sitting at the terminal.

### 4. Automated Diagnostic Flight Recorder (`device_snapshot`)
* At the exact millisecond of ticket creation, the background agent captures a structured telemetry snapshot conforming to `AgentFlightRecorderSchema`:
  * Operating system name, build version, and system uptime.
  * CPU Usage %, RAM Used / Total %, and Disk Usage %.
  * Active window title (the software in focus when the problem occurred).
  * Top 5 resource-consuming processes (PID, Name, CPU %, Memory bytes).
  * Recent critical Windows Event Log errors (Application & System event sources).
* Persisted in a JSONB column `tickets.device_snapshot` and rendered in the web portal via [`TicketFlightRecorderCard.tsx`](file:///c:/Users/PC/Workspace/msp_client_portal/client/src/features/tickets/components/TicketFlightRecorderCard.tsx).

### 5. Zero-Latency WebSocket Push Relay (`TICKET_CHAT_PUSH`)
* When a technician posts a message from the web portal (`TicketDetailPage.tsx` $\rightarrow$ `POST /api/v1/tickets/:id/responses`), `TicketResponseService` checks if the ticket is bound to an `equipment_id`.
* If the workstation is connected to `AgentGateway`, the server dispatches a `TICKET_CHAT_PUSH` frame over the active WebSocket connection in $< 100\text{ms}$.
* The agent receives the frame, forwards it across the Named Pipe to `msp-tray`, and alerts the desk user with an unread tray badge and notification chime.

### 6. Quota Enforcement & Round-Robin Dispatch Compliance
* Machine ticket creation (`POST /api/v1/tickets/agent`) enforces the tenant's monthly subscription ticket quota via `TicketQuotaService.enforceTicketLimit` ([`BL-201`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L64)).
* Immediately triggers Round-Robin Dispatch ([`BL-102`](file:///c:/Users/PC/Workspace/msp_client_portal/AGENTS.md#L61)) to assign an active specialist technician and creates audit events.
* Device users can mark their ticket as `RESOLVED` directly from the tray without CSAT popups (per approved concept).

---

## Alternatives Considered

### 1. Monolithic Electron Desktop Application
* **Pros:** Single codebase for both background daemon and tray UI.
* **Cons:** Massive memory footprint (150MB+ idle vs 15MB for Tauri), slow startup time, high CPU overhead on client workstations, and cannot run headless as a Windows Service across user logouts due to Windows Session 0 isolation.
* **Verdict:** Rejected in favor of the two-process architecture pairing a headless Rust daemon (`msp-agent`) with a Tauri v2 interactive companion (`msp-tray`).

### 2. Single Service Running UI from Session 0
* **Pros:** Simpler architecture with one running binary.
* **Cons:** Windows Vista/7/10/11 strictly isolates Session 0 services from the interactive desktop (Interactive Services Detection mitigations). Services cannot display windows, taskbar trays, or notifications to logged-in users.
* **Verdict:** Rejected due to OS security constraints.

### 3. Polling Server HTTP API from Desktop Client
* **Pros:** Simple to implement; no WebSocket message routing needed.
* **Cons:** High server request volume, battery/network drain on endpoints, and introduces unacceptable message latency (5–30 seconds delay between technician replies and user alerts).
* **Verdict:** Rejected in favor of real-time push over the pre-existing `AgentGateway` WebSocket connection.

### 4. Attributing Solely via Windows `%USERNAME%`
* **Pros:** Zero user input required.
* **Cons:** Fails on shift workstations with shared domain accounts (`reception`, `cashier1`, `nurse_station`), making follow-up impossible when shifts rotate.
* **Verdict:** Rejected. Prompting once for Name and Email and caching in `%LOCALAPPDATA%` provides high-fidelity attribution with zero ongoing friction.

---

## Consequences

* **Mean Time to Resolution (MTTR):** Drastically reduced because tickets arrive pre-populated with actionable hardware and process diagnostics, eliminating back-and-forth questioning.
* **End-User Experience:** Workstation users report issues in 1 click from their taskbar and converse with MSP technicians in real-time, matching modern consumer chat experiences.
* **Security & Isolation:** Enforces Zero Standing Privilege. Physical workstations never possess database credentials or user JWTs; communication is authenticated exclusively via rotating machine tokens.
* **Codebase & Architecture Integrity:** All requests, flight recorder snapshots, and responses are strongly typed in `@shared/contracts`, with full bilingual localization (`en_US.json` and `es_DO.json`) and zero architecture boundary violations.
* **Testability:** Verified by an automated end-to-end simulation harness (`server/src/scripts/simulate-agent-ticket-flow.ts`), 80 passing backend test suites (788 tests), and 45 passing frontend test suites (286 tests).
