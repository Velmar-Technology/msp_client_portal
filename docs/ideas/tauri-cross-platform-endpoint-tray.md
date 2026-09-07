# Architecture Concept: Cross-Platform Tauri v2 System Tray Companion (`msp-tray`)

## Status
Approved Concept / Endpoint Roadmap (Formalized in [ADR-005](../decisions/ADR-005-endpoint-agent-no-login-ticketing-and-realtime-chat.md) & [IPC Specification](../architecture/endpoint-tray-ipc-specification.md))

## Date
2026-09-07

---

## 1. Executive Summary
To enable workstation users to report IT issues and converse in real-time with MSP technicians without portal logins, we introduce **`msp-tray`**—a lightweight, cross-platform desktop assistant built with **Tauri v2**. 

Rather than replacing the existing headless Rust daemon (`packages/msp-agent`), we adopt a **Two-Process Architecture**:
1. **`msp-agent` (Daemon / System Service):** Runs 24/7 with high privileges (`LocalSystem` / `root`) to maintain background RMM telemetry, remote PowerShell/command execution, hardware health monitoring, and WebSocket connectivity even when no interactive user is logged into the workstation.
2. **`msp-tray` (Interactive Desktop Companion):** Runs in the logged-in user's interactive session (Session 1+ on Windows, user desktop on macOS/Linux). It provides a sleek native system tray / menu bar interface, an instant 1-click issue reporting dialog, a live ticket chat drawer mirroring [`TicketResponses.tsx`](file:///c:/Users/PC/Workspace/msp_client_portal/client/src/features/tickets/components/TicketResponses.tsx), and screen snippet paste (`Ctrl+V`).

Communication between the two processes occurs over an authenticated, local Inter-Process Communication (IPC) transport.

---

## 2. Architecture & Process Model

```
Workstation Endpoint
┌─────────────────────────────────────────────────────────────┐
│  USER SESSION (Interactive Desktop - Session 1+)            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               packages/msp-tray                       │  │
│  │        (Tauri v2 + React / Tailwind / Radix)          │  │
│  │  - Native System Tray / Menu Bar Icon                 │  │
│  │  - Instant Issue Report Modal                         │  │
│  │  - Live Ticket Chat Drawer (TicketResponses.tsx)      │  │
│  │  - Screen Snip / Clipboard Paste (Ctrl+V)             │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │ Local IPC (Named Pipe / UDS)  │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM SESSION (Background Service - Session 0 / Daemon)   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              packages/msp-agent                       │  │
│  │            (Existing Rust 24/7 Daemon)                │  │
│  │  - 24/7 Telemetry & Hardware Heartbeat                │  │
│  │  - AgentGateway WebSocket Tunnel                      │  │
│  │  - Remote Diagnostics & Windows Event Log Scans       │  │
│  │  - ZSP Token Storage (agentToken)                     │  │
│  │  - Local IPC Server Provider                          │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ WSS / HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   MSP Backend / Portal                      │
│        (server: Express 5 + AgentGateway WebSocket)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Why Tauri v2?

### 3.1 True Cross-Platform Desktop Parity
* **Windows (Win32):** Sits in the Windows Notification Area (System Tray), supports native Windows 11 hover cards, and opens a docked flyout above the taskbar.
* **macOS:** Native Menu Bar Extra (`NSStatusItem`) supporting system Dark Mode, translucent vibrancy, and native Retina rendering.
* **Linux:** `AppIndicator` / `libayatana-appindicator` for GNOME, KDE, and XFCE desktops.
* **Global Shortcuts:** Single configurable hotkey (`Ctrl+Alt+F12` on Windows/Linux, `Cmd+Option+F12` on macOS) to instantly summon the support drawer from any active application.

### 3.2 Unified Frontend Codebase & Design Language
Because Tauri uses standard HTML/React/TypeScript for its presentation layer, `msp-tray` can share components, styling tokens, and validation schemas directly from the existing monorepo:
* **UI Tokens & Components:** Reuses our Tailwind v4 setup and `shadcn/ui` (Radix) primitives.
* **Chat Stream:** Renders the exact same threaded discussion component seen in [`TicketResponses.tsx`](file:///c:/Users/PC/Workspace/msp_client_portal/client/src/features/tickets/components/TicketResponses.tsx).
* **Contracts:** Validates payloads directly against `@shared/contracts`.

### 3.3 Ultra-Low Resource Footprint
Traditional MSP RMM agents (Kaseya, Datto, ConnectWise) rely on Electron or bulky .NET runtimes that consume 150MB–350MB of RAM:
* `msp-agent` (Rust headless daemon): **~10–14MB RAM**
* `msp-tray` (Tauri v2 with OS native webview): **~20–25MB RAM**
* **Total Combined Footprint:** **$< 40\text{MB}$ RAM**, completely imperceptible to end-users even on constrained office workstations.

---

## 4. Local IPC Protocol Specification

Communication between `msp-tray` and `msp-agent` is secured using a local OS transport:
* **Windows:** Named Pipe `\\.\pipe\msp-agent-ipc` (configured with a DACL granting `GENERIC_READ | GENERIC_WRITE` to authenticated interactive users).
* **macOS / Linux:** Unix Domain Socket `/var/run/msp-agent.sock` (permissions `0660`, belonging to the `msp-agent` group).

### IPC Message Schema (Length-Prefixed JSON-RPC)

```typescript
// Tray -> Daemon: Report an issue
interface ReportIssueRequest {
  type: "REPORT_ISSUE";
  reporterName: string;
  reporterEmail: string;
  category: "REPAIR" | "HELPDESK" | "SERVICE_OUTAGE" | "PREVENTATIVE_MAINTENANCE";
  description: string;
  screenshotBase64?: string;
}

// Daemon -> Tray: Ticket created confirmation
interface TicketCreatedEvent {
  type: "TICKET_CREATED";
  ticketId: string;
  title: string;
  status: "OPEN";
  assignedTechName?: string;
  createdAt: string;
}

// Daemon -> Tray: Inbound chat push from technician
interface IncomingChatPushEvent {
  type: "INCOMING_CHAT_MESSAGE";
  ticketId: string;
  responseId: string;
  authorName: string;
  authorRole: "TECHNICIAN" | "ADMIN";
  message: string;
  attachments?: Array<{ id: string; name: string; url: string }>;
  createdAt: string;
}

// Tray -> Daemon: Send user reply
interface SendChatMessageRequest {
  type: "SEND_CHAT_MESSAGE";
  ticketId: string;
  reporterName: string;
  message: string;
  screenshotBase64?: string;
}

// Tray -> Daemon: 1-click resolve
interface ResolveTicketRequest {
  type: "RESOLVE_TICKET";
  ticketId: string;
}
```

---

## 5. Security & Privilege Separation

1. **Principle of Least Privilege:**
   * `msp-tray` runs unprivileged in user space. It possesses **no administrative rights** and **no network credentials**.
   * It cannot be used by a compromised desktop session to gain `SYSTEM` or root access.
2. **Credential Isolation:**
   * The `agentToken` is stored securely on disk by `msp-agent` (DPAPI-encrypted on Windows, root-owned config on Linux/macOS).
   * `msp-tray` never touches the raw `agentToken` or database credentials.
3. **Local IPC Validation:**
   * `msp-agent` validates that IPC connections originate from the locally logged-in console user before processing requests.

---

## 6. Monorepo Roadmap & Next Steps

* **Phase A (Current Focus):** Backend ingestion endpoints (`POST /api/v1/tickets/agent`), WebSocket push relay in `AgentGateway`, database migration `042`, and web portal visibility in `TicketDetailPage.tsx`.
* **Phase B (Endpoint IPC & Daemon Upgrade):** Add Named Pipe IPC server to `packages/msp-agent` using `tokio` and the `interprocess` crate.
* **Phase C (`packages/msp-tray`):** Initialize Tauri v2 workspace package with React UI, system tray icon, issue reporter modal, and live chat drawer.
