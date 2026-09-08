# MSP Support MCP Server (`@msp/mcp-server`)

Model Context Protocol (MCP) server engineered according to the **MCP 2026-07-28 Specification Revision**, providing LLMs (Antigravity, Claude Desktop, Cursor, and autonomous AI agents) with real-time access to ticket diagnostics, live device RMM telemetry, hardware inventory, security posture auditing, automated remediation tools, and pre-packaged AI prompts.

---

## Architecture & 2026-07-28 SOTA Compliance

| Paradigm                       | Spec Requirement                                                                                                | `@msp/mcp-server` Implementation                                                                                                            |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stateless Request-Response** | Pure stateless execution; zero in-memory session persistence between calls; serverless/edge compatibility.      | Fully decoupled stateless architecture. Computes tenant/user context per request; deployable on AWS Lambda, Cloudflare Workers, or Node.js. |
| **Streamable HTTP**            | Deprecates legacy HTTP+SSE multi-request handshakes in favor of standardized, single-roundtrip Streamable HTTP. | Native `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })` supporting `POST /mcp` streaming and health probes.               |
| **Enterprise Security & PDP**  | Native OAuth 2.0 / OIDC / API Key authentication with runtime RBAC & Zero Standing Privileges.                  | Strict `MSP_API_KEY` / JWT validation, forwarding through `Authorization: Bearer <token>` and `X-API-Key` to the Unified PDP (BL-302).      |
| **Extension Primitives**       | Full support for MCP Tools, dynamic Resources, workflow Prompts, background Tasks, and UI Apps.                 | 18 specialized diagnostic/remediation tools, real-time dynamic URI resources, multi-step prompts, and interactive visual schemas.           |

---

## Complete MCP Tools Catalog (18 Tools)

### 1. Ticket Diagnosis & Management

- **`msp_get_ticket`**: Fetches complete ticket details, conversation history, client info, SLA timers, and linked hardware asset.
- **`msp_list_tickets`**: Queries open/pending tickets filtered by tenant, status (`OPEN`, `IN_PROGRESS`, etc.), priority (`CRITICAL`, `HIGH`, etc.), or assigned technician.
- **`msp_add_ticket_reply`**: Posts internal triage notes (`isInternal: true`) or client-facing updates (`isInternal: false`).
- **`msp_update_ticket_status`**: Transitions ticket lifecycle status following SLA cancellation (`BL-101`) and state transition matrix rules.

### 2. RMM Cloud Device Telemetry & Health

- **`msp_get_device_telemetry`**: Retrieves real-time CPU, RAM, Disk utilization, agent online status, and pending patch counts.
- **`msp_list_device_patches`**: Lists pending and installed OS patches with severity ratings.
- **`msp_get_device_maintenances`**: Inspects scheduled and past maintenance records.

### 3. Inventory & Client Health

- **`msp_get_client_equipment`**: Lists registered workstations, servers, serial numbers, and activation status for a tenant.
- **`msp_get_client_health`**: Computes composite health score ($H = 0.40 \times S_{\text{ticket}} + 0.30 \times S_{\text{hardware}} + 0.30 \times S_{\text{security}}$).

### 4. Live Host Diagnostics & Event Logs

- **`msp_diagnose_local_pc`**: Direct host metrics: CPU model/cores, RAM usage %, all drive sizes/free space, and network adapters.
- **`msp_get_local_event_logs`**: Queries Windows Event Log (Application / System) for crashes and error codes.

### 5. Security & Endpoint Compliance

- **`msp_audit_security_posture`**: Audits BitLocker encryption, Windows Defender real-time protection, Firewall profiles, TPM 2.0 presence, UEFI Secure Boot, UAC, Remote Desktop (RDP), PowerShell execution policies, and reboot flags.
- **`msp_inspect_open_ports`**: Scans listening TCP ports and associated processes.
- **`msp_list_startup_programs`**: Audits autorun / startup registry applications.

### 6. Active Remediation & Network Troubleshooting

- **`msp_restart_windows_service`**: Restarts stuck Windows background services (Spooler, DNS, EDR, etc.).
- **`msp_network_troubleshoot`**: Tests Gateway latency, DNS resolution, and internet ping.
- **`msp_flush_dns_and_renew_dhcp`**: Flushes local DNS cache and renews DHCP lease.
- **`msp_clean_temp_storage`**: Calculates and purges Windows/User temp files and dump files with dry-run support.

### 7. Zero Standing Privileges & Hybrid Authorization (BL-302)

- **`msp_request_ephemeral_access`**: Requests Just-In-Time (JIT) elevated privilege access (`ADMIN`, `TECHNICIAN`, etc.) with TTL, justification, and emergency break-glass.
- **`msp_list_active_jit_grants`**: Queries active ephemeral elevation grants and remaining validity TTL.
- **`msp_revoke_ephemeral_grant`**: Immediately revokes an active ephemeral elevation grant.
- **`msp_check_access_decision`**: Tests permission evaluation against the Unified PDP (RBAC + Zanzibar ReBAC + Policy-as-Code ABAC).
- **`msp_get_trust_score`**: Queries real-time Continuous Adaptive Trust (CAT) risk anomaly score and risk factors.

### 8. Domain & Vital Service Health Diagnostics

- **`msp_check_domain_services`**: Comprehensive diagnostic audit of a domain (e.g. `helpdesk.velmartech.com.do`), resolving DNS (A/AAAA/MX/TXT), probing mail services (SMTP 25/587/465, IMAP 993, POP3 995), and auditing HTTPS availability and SSL certificate validity.
- **`msp_get_system_api_status`**: Queries real-time backend platform diagnostics, database latency, Nextcloud storage health, and environment configuration audits.

### 9. Email & Notification Inspection

- **`msp_get_last_email`**: Retrieves the most recent email or dispatched notification, supporting both direct TLS IMAP inspection (`imap.gmail.com:993`) and portal-dispatched transactional email alerts.
- **`msp_list_notifications`**: Lists recent transactional email notifications, ticket alerts, and system broadcast events for the authenticated account.

### 10. Deep Network Layer & Wi-Fi Telemetry

- **`msp_audit_network_interfaces`**: Comprehensive network interface and connectivity audit: lists all active adapters, IP/gateway/DNS configuration, Wi-Fi RF parameters (SSID, BSSID, Signal %, channel, link rates), multi-point latency benchmarks (Gateway, Public DNS `1.1.1.1`, Helpdesk), and DNS resolution health diagnostics.

### 11. Storage & Disk Space Hotspot Analysis

- **`msp_analyze_disk_storage`**: Deep storage breakdown: volume capacities, free space percentage, health evaluation, and hotspot directory inspection (Downloads, Docker VHDX, WSL, npm-cache, crash dumps, and temp pools).

---

## Dynamic MCP Resources

- `msp://tickets/{ticketId}`: Real-time ticket entity snapshot and SLA state.
- `msp://devices/{deviceId}/telemetry`: Live hardware metrics, memory pressure, and patch delta.
- `msp://tenants/{tenantId}/health`: Aggregated infrastructure health scoring and QBR readiness flags.

---

## Built-In MCP Prompts

- **`triage_ticket`**: End-to-end guided ticket diagnosis workflow (ticket fetch $\rightarrow$ telemetry $\rightarrow$ event log inspection $\rightarrow$ root cause + response draft).
- **`qbr_executive_brief`**: Generates a complete executive Quarterly Business Review IT health presentation for client leadership.

---

## Dual-Mode Execution

### 1. Local Stdio Transport (IDE & Desktop Subagents)

Runs standard input/output JSON-RPC stream for Antigravity, Claude Desktop, Cursor, etc.

Configured in `C:\Users\PC\.gemini\config\mcp_config.json`:

```json
{
  "mcpServers": {
    "msp-server": {
      "command": "node",
      "args": ["c:/Users/PC/Workspace/msp_client_portal/packages/mcp-server/dist/index.js"],
      "env": {
        "MSP_API_URL": "http://localhost:3001/api/v1",
        "MSP_SERVER_URL": "http://localhost:3001",
        "MSP_API_KEY": "msp_live_api_key_secure_session"
      }
    }
  }
}
```

### 2. Stateless Streamable HTTP Transport (Serverless, Cloud & Edge)

Runs a standalone HTTP server handling single-roundtrip `POST /mcp` JSON-RPC streams:

```bash
# Start in Streamable HTTP Mode (default port 3005)
npm -w packages/mcp-server run start:http

# Development Mode with live watch
npm -w packages/mcp-server run dev:http
```

**Endpoints:**

- `POST http://localhost:3005/mcp`: Streamable HTTP MCP JSON-RPC endpoint.
- `GET  http://localhost:3005/health`: Health and spec compliance diagnostics.

---

## Build & Test

```bash
# Build TypeScript bundle
npm -w packages/mcp-server run build

# Run unit and integration tests
npm -w packages/mcp-server run test
```
