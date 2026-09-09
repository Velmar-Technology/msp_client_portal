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

### 2. RMM Cloud Device Telemetry & Remote Agent Management

- **`msp_get_device_telemetry`**: Retrieves real-time CPU, RAM, Disk utilization, agent online status, and pending patch counts.
- **`msp_list_device_patches`**: Lists pending and installed OS patches with severity ratings.
- **`msp_get_device_maintenances`**: Inspects scheduled and past maintenance records.
- **`msp_remote_diagnose_pc`**: Executes live hardware diagnostics on a remote client endpoint via the agent tunnel.
- **`msp_remote_get_event_logs`**: Queries Windows Event Logs (Application / System) on a remote client endpoint.
- **`msp_remote_security_audit`**: Audits BitLocker, Defender, and Firewall posture on a remote endpoint.
- **`msp_remote_upgrade_agent`**: Triggers an autonomous, in-place Over-The-Air (OTA) self-upgrade on a remote endpoint running `msp-agent.exe` with atomic move swap, SHA-256 integrity verification, and automated 45-second rollback protection.

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

### 12. Billing, Invoicing & Pricing Catalog

- **`msp_list_plans`**: Exports full subscription plans pricing catalog, tiers, billing terms, feature codes, and quotas with Markdown table and JSON output.
- **`msp_list_invoices`**: Queries tenant invoices with NCF statuses, tax breakdowns, and settlement states.
- **`msp_get_invoice`**: Detailed invoice inspection with line items, ITBIS tax, and payment vouchers.
- **`msp_get_financial_stats`**: High-level financial KPIs, revenue performance, and collection analytics.
- **`msp_list_expenses`**: Operational expenses and technician commission bounties (BL-801/BL-802).

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
    "msp-support": {
      "command": "node",
      "args": ["c:/Users/eapolanco/Workspace/msp_client_portal/packages/mcp-server/dist/index.js"],
      "env": {
        "MSP_API_URL": "https://helpdesk.velmartech.com.do",
        "MSP_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

- `POST https://helpdesk.velmartech.com.do/mcp`: Streamable HTTP MCP JSON-RPC endpoint.
- `GET  https://helpdesk.velmartech.com.do/mcp` / `GET /health`: Health and spec compliance diagnostics.

---

## Microsoft Copilot Studio Agent Integration

`@msp/mcp-server` is natively compatible with Microsoft Copilot Studio's Model Context Protocol (MCP) tool integration over Streamable HTTP.

### Connection Parameters

| Parameter | Copilot Studio Field | Value |
| :--- | :--- | :--- |
| **Server Name** | Server name | `MSPSupportMcp` |
| **Server Description** | Server description | `Provides access to MSP portal tickets, RMM telemetry, remote endpoint agent commands, client equipment, and security audits.` |
| **Server URL** | Server URL | `https://helpdesk.velmartech.com.do/mcp` |
| **Authentication** | Authentication | `API key` |
| **Parameter Type** | Parameter type | `Header` |
| **Header Name** | Header name | `X-API-Key` *(or `Authorization`)* |
| **Key Value** | Key value | Your active `MSP_API_KEY` (JWT token) |

### Inbound Header Authentication (Option B)

Incoming HTTP requests to `POST /mcp` are authenticated via timing-safe comparison (`crypto.timingSafeEqual`):
- `X-API-Key: <key>` (Direct token)
- `Authorization: Bearer <key>` (Standard Bearer format)
- `Authorization: <key>` (Raw header)

Probes (`GET /mcp` and `GET /health`) remain open for orchestrator liveness checks and return `HTTP 200` with server metadata.

---

## Production Docker Deployment

The MCP server runs as container `msp_mcp_prod` within the `msp_portal` Docker Compose stack on the helpdesk VPS:

- **Image:** `msp_mcp_prod:latest` (built from `packages/mcp-server/Dockerfile`, Alpine Node.js 22 runtime).
- **Networks:** `default` (bridge) + `reverse-proxy` (Traefik ingress).
- **Ingress:** Traefik v3 terminates TLS for `https://helpdesk.velmartech.com.do/mcp` and load balances to internal port `3005`.
- **Environment:**
  - `MSP_SERVER_URL="helpdesk.velmartech.com.do"` (resolves to `https://helpdesk.velmartech.com.do/api/v1`)
  - `MSP_API_KEY=<JWT Admin Token>`
  - `MCP_TRANSPORT="http"`
  - `MCP_HTTP_PORT=3005`

---

## Build & Test

```bash
# Build TypeScript bundle
npm -w packages/mcp-server run build

# Run unit and integration tests (24 tests)
npm -w packages/mcp-server run test
```

