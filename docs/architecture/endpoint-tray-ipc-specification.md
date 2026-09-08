# Architecture Specification: Endpoint Agent & Desktop Tray IPC

**Status:** APPROVED  
**Version:** 1.0.0  
**Authors:** MSP Engineering Team  
**Components:** `packages/msp-agent` (Headless Rust Daemon) $\longleftrightarrow$ `packages/msp-tray` (Tauri v2 Desktop Assistant)

---

## 1. Executive Summary

Workstation endpoints run a two-process architecture to balance 24/7 telemetry and elevated system monitoring with a lightweight, secure user experience:
1. **Headless Daemon (`msp-agent.exe` / `systemd` service):**
   - Runs continuously in Session 0 (LocalSystem / root).
   - Manages RMM telemetry, hardware metric sampling, OS patch auditing, and the persistent cloud WebSocket connection (`AgentGateway`).
   - Owns and protects the workstation machine credential (`agent_token`).
2. **Desktop Tray Drawer (`msp-tray.exe`):**
   - Runs in active user sessions (Session 1+) as a lightweight Tauri v2 app.
   - Resides in the Windows Taskbar Notification Area (System Tray) / macOS Menu Bar.
   - Provides a 1-click issue reporting interface and live technician chat drawer mirroring `TicketDetailPage.tsx`.
   - Communicates **strictly locally** with `msp-agent` via OS-native Inter-Process Communication (IPC).

```
   ┌─────────────────────────────────────────────────────────────┐
   │ Cloud MSP Platform (AgentGateway WS + Express API)          │
   └──────────────────────────────▲──────────────────────────────┘
                                  │ WSS (agent_token)
                                  │
   ┌──────────────────────────────▼──────────────────────────────┐
   │ Workstation Machine (Session 0 - LocalSystem)               │
   │  msp-agent.exe (Headless Rust Daemon)                        │
   │  - Hardware telemetry sampler & flight recorder             │
   │  - Named Pipe IPC Server: \\.\pipe\msp-agent-ipc            │
   └──────────────────────────────▲──────────────────────────────┘
                                  │ Local IPC (Length-Prefixed JSON)
                                  │
   ┌──────────────────────────────▼──────────────────────────────┐
   │ Active User Desktop (Session 1+ - Desk User)                │
   │  msp-tray.exe (Tauri v2 System Tray Drawer)                 │
   │  - Unread badge & audio alerts                              │
   │  - Shift-worker attribution (%LOCALAPPDATA%)                │
   │  - React 19 / Tailwind / Radix UI chat drawer               │
   └─────────────────────────────────────────────────────────────┘
```

---

## 2. Local Transport & Security Model

### 2.1 Transport Endpoints
* **Windows:** Named Pipe: `\\.\pipe\msp-agent-ipc`
* **macOS / Linux:** Unix Domain Socket (UDS): `/var/run/msp-agent.sock` (fallback: `/tmp/msp-agent.sock` with `0660` permissions).

### 2.2 Security & Access Control (Windows DACL)
* The Named Pipe is created by `msp-agent.exe` with a strict Discretionary Access Control List (DACL):
  - `GENERIC_ALL` for `NT AUTHORITY\SYSTEM`.
  - `GENERIC_ALL` for `BUILTIN\Administrators`.
  - `FILE_GENERIC_READ | FILE_GENERIC_WRITE` for `NT AUTHORITY\INTERACTIVE` (users actively logged into the physical or RDP console).
  - Network logon (`NT AUTHORITY\NETWORK`) is explicitly **DENIED** (`PIPE_REJECT_REMOTE_CLIENTS`).

### 2.3 Wire Protocol & Framing
All messages across the IPC pipe use a standard 4-byte big-endian length prefix followed by UTF-8 encoded JSON:

```
+---------------------------+-----------------------------------------------+
| Length: uint32 (4 bytes)  | Payload: JSON UTF-8 (Length bytes)            |
+---------------------------+-----------------------------------------------+
```

* Maximum payload size: `8 MB` (to comfortably accommodate embedded base64 screenshots without chunking).

---

## 3. Shift-Worker Attribution

Workstations are shared by shift workers. When a worker opens the tray assistant for the first time:
1. The tray app checks for cached attribution in `%LOCALAPPDATA%\VelmarMSP\attribution.json`:
   ```json
   {
     "reporterName": "Sarah Jenkins",
     "reporterEmail": "sarah.jenkins@acmecorp.com",
     "rememberedAt": "2026-09-07T12:00:00.000Z"
   }
   ```
2. If absent, the tray presents a prompt:
   - *"Please enter your Name and Email so our support technicians can reach you regarding this workstation."*
3. The entered identity is cached locally and passed with all subsequent ticket creation and message actions.

---

## 4. Message Schemas (IPC Contracts)

Every IPC message envelope adheres to:
```typescript
interface IpcEnvelope<T = any> {
  id: string;            // UUID v4 correlation ID
  type: string;          // Message action type
  timestamp: string;     // ISO-8601 UTC
  payload: T;            // Typed payload
}
```

### 4.1 Handshake & Status
#### `TRAY_HELLO` (Tray $\longrightarrow$ Agent)
Sent immediately upon tray connection to register the user session.
```json
{
  "id": "e30560a5-f860-4b20-94fc-92b0fa170f80",
  "type": "TRAY_HELLO",
  "timestamp": "2026-09-07T12:00:00Z",
  "payload": {
    "trayVersion": "1.0.0",
    "windowsUser": "sjenkins",
    "sessionId": 1
  }
}
```

#### `AGENT_STATUS` (Agent $\longrightarrow$ Tray)
Response containing connection state, bound equipment ID, tenant, and company name.
```json
{
  "id": "e30560a5-f860-4b20-94fc-92b0fa170f80",
  "type": "AGENT_STATUS",
  "timestamp": "2026-09-07T12:00:00Z",
  "payload": {
    "agentOnline": true,
    "cloudConnected": true,
    "equipmentId": "c479e096-7c6d-4950-8b1b-56cb2f205c04",
    "hostname": "WORKSTATION-04",
    "tenantName": "Acme Corp",
    "activeTicketCount": 1
  }
}
```

---

### 4.2 Ticket Creation with Automated Flight Recorder
#### `TICKET_CREATE_REQUEST` (Tray $\longrightarrow$ Agent)
When the user clicks "Submit Issue", the tray passes user inputs to the agent daemon.
```json
{
  "id": "a9019d3f-5820-4318-bd69-b593efd94d7b",
  "type": "TICKET_CREATE_REQUEST",
  "timestamp": "2026-09-07T12:05:00Z",
  "payload": {
    "reporterName": "Sarah Jenkins",
    "reporterEmail": "sarah@acme.corp",
    "title": "ERP client crashes on invoice generation",
    "description": "Every time I click 'Print NCF' on SAP Business One, the window freezes and closes.",
    "category": "HELPDESK",
    "priority": "HIGH",
    "screenshotBase64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

#### Agent Execution Logic:
1. Agent intercepts the request.
2. Samples live metrics (CPU %, RAM %, Disk %, Active Window title, Top 5 processes by CPU, and last 3 Event Log errors).
3. Assembles the `deviceSnapshot` conforming to `AgentFlightRecorderSchema`.
4. Executes `POST /api/v1/tickets/agent` using the machine's `agent_token`:
   ```json
   {
     "reporterName": "Sarah Jenkins",
     "reporterEmail": "sarah@acme.corp",
     "title": "ERP client crashes on invoice generation",
     "description": "...",
     "category": "HELPDESK",
     "priority": "HIGH",
     "deviceSnapshot": {
       "os": "Windows 11 Pro",
       "osVersion": "10.0.22631",
       "uptimeSeconds": 142850,
       "cpuUsagePercent": 94.2,
       "memoryUsagePercent": 82.5,
       "memoryTotalBytes": 17179869184,
       "memoryUsedBytes": 14173392076,
       "diskUsagePercent": 48.0,
       "activeWindowTitle": "SAP Business One - [A/R Invoice]",
       "topProcesses": [
         { "name": "SAP Business One.exe", "pid": 4820, "cpuPercent": 84.1, "memoryBytes": 1845493760 },
         { "name": "chrome.exe", "pid": 1120, "cpuPercent": 4.2, "memoryBytes": 954000000 }
       ],
       "recentEventErrors": [
         { "source": "Application Error", "eventId": 1000, "message": "Faulting application SAP Business One.exe, version 10.0..." }
       ]
     }
   }
   ```
5. Returns `TICKET_CREATE_RESPONSE` back to tray:
```json
{
  "id": "a9019d3f-5820-4318-bd69-b593efd94d7b",
  "type": "TICKET_CREATE_RESPONSE",
  "timestamp": "2026-09-07T12:05:02Z",
  "payload": {
    "success": true,
    "ticketId": "f5195e34-582b-4221-a392-80ea47f5cf82",
    "title": "ERP client crashes on invoice generation",
    "assignedTechName": "Dan Lead Engineer",
    "status": "OPEN",
    "createdAt": "2026-09-07T12:05:02.102Z"
  }
}
```

---

### 4.3 Real-Time Ticket Chat Relay
#### `TICKET_CHAT_PUSH` (Agent $\longrightarrow$ Tray)
When a technician replies from the portal, `AgentGateway` sends a WebSocket frame to the workstation. `msp-agent` unwraps the frame and forwards it across the Named Pipe to `msp-tray`:
```json
{
  "id": "chat-1757261100000-abc12",
  "type": "TICKET_CHAT_PUSH",
  "timestamp": "2026-09-07T12:10:00Z",
  "payload": {
    "ticketId": "f5195e34-582b-4221-a392-80ea47f5cf82",
    "responseId": "7e3cb20a-8109-4d8b-bdc1-3a059520b571",
    "authorName": "Dan Lead Engineer",
    "authorRole": "TECHNICIAN",
    "message": "Hi Sarah, I see SAP Business One faulted with Event 1000 in your flight recorder snapshot. Please leave the application closed; I am pushing a hotfix now.",
    "attachments": [],
    "createdAt": "2026-09-07T12:10:00.000Z"
  }
}
```
* **Tray Behavior:**
  - If tray drawer is closed: plays audio chime, increments unread tray badge icon, and displays a Windows Toast notification: *"MSP Support: New message on ticket #f519"*.
  - If tray drawer is open: smoothly scrolls conversation and appends the message bubble.

#### `TICKET_CHAT_SEND` (Tray $\longrightarrow$ Agent)
When the user sends a reply from the desktop drawer:
```json
{
  "id": "e0b57fa2-1200-4ea7-8b01-a4f664a75399",
  "type": "TICKET_CHAT_SEND",
  "timestamp": "2026-09-07T12:12:00Z",
  "payload": {
    "ticketId": "f5195e34-582b-4221-a392-80ea47f5cf82",
    "reporterName": "Sarah Jenkins",
    "message": "Thank you Dan! I closed SAP and will wait for your update."
  }
}
```
* **Agent Behavior:**
  - Calls `POST /api/v1/tickets/:id/responses/agent` over HTTPS using `agent_token`.
  - Confirms receipt and returns `TICKET_CHAT_SEND_ACK` to tray.

---

## 5. Security Invariants
1. **Zero Client Secret Escrow:** The web UI / user tray app never sees, stores, or transmits `agent_token` or database keys. All authenticated cloud calls route through the elevated daemon.
2. **Local Session Boundaries:** The daemon verifies `GetNamedPipeClientProcessId` on incoming pipe connections to prevent non-interactive service spoofing.
3. **Graceful Disconnection:** If `msp-agent` is stopped for maintenance or restart, `msp-tray` transitions to a subtle "Offline / Connecting to Service..." indicator without freezing or crashing.
