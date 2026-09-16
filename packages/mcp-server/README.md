# MSP Support & CAF Educational Quality MCP Server (`@msp/mcp-server`)

Model Context Protocol (MCP) server engineered according to the **MCP 2026-07-28 Specification Revision**, providing LLMs (Antigravity, Claude Desktop, Cursor, and Microsoft Copilot Studio autonomous agents) with:
- **Enterprise MSP IT Support:** 59 diagnostic, telemetry, RMM, security, and remediation tools connected to the MSP Client Portal backend.
- **Academic CAF Quality AIaaS:** 7 isolated tools for Dominican educational institutions executing Common Assessment Framework (CAF / Marco Común de Evaluación) evaluations, documentary gap detection, and Institutional Improvement Plan (PMI) generation.
- **Dominican Law 172-13 Privacy Protection:** In-memory PII sanitization (names, cédulas, emails, phone numbers) before LLM egress.
- **Zero-Liability Multi-Tenant BYOK:** Bring-Your-Own-Key LLM runtime (`TenantByokManager`) supporting OpenAI, Anthropic, and local custom endpoints funded directly by educational institutions.

---

## Architecture & 2026-07-28 SOTA Compliance

| Paradigm                       | Spec Requirement                                                                                                | `@msp/mcp-server` Implementation                                                                                                            |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stateless Request-Response** | Pure stateless execution; zero in-memory session persistence between calls; serverless/edge compatibility.      | Fully decoupled stateless architecture. Computes tenant/user context per request; deployable on AWS Lambda, Cloudflare Workers, or Node.js. |
| **Streamable HTTP**            | Deprecates legacy HTTP+SSE multi-request handshakes in favor of standardized, single-roundtrip Streamable HTTP. | Native `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })` supporting `POST /mcp` and `POST /mcp/caf` streaming and probes. |
| **Least-Privilege Isolation**  | Restrict tool catalogs by agent domain; prevent capability bleed or cross-tenant privilege escalation.          | Profile-based isolation (`McpServerProfile`: `all`, `msp-support`, `caf-education`). `/mcp/caf` serves zero IT/PowerShell tools.            |
| **Enterprise Security & PDP**  | Native OAuth 2.0 / OIDC / API Key authentication with runtime RBAC & Zero Standing Privileges.                  | Strict `MSP_API_KEY` / JWT validation, forwarding through `Authorization: Bearer <token>` and `X-API-Key` to the Unified PDP (BL-302).      |
| **Extension Primitives**       | Full support for MCP Tools, dynamic Resources, workflow Prompts, background Tasks, and UI Apps.                 | 66 specialized tools, real-time dynamic URI resources, multi-step prompts, and interactive visual schemas.                                 |

---

## Least-Privilege Profile Isolation

The server can be run in three profile modes via CLI flags (`--caf`, `--msp`, `--all`) or environment variable (`MCP_PROFILE`):

| Profile Mode | Active Tool Catalog | Intended Use Case / Route |
| :--- | :--- | :--- |
| **`caf-education`** | **7 CAF & Privacy tools ONLY** (Zero IT tools) | Public Educational AIaaS Copilots (`POST /mcp/caf`); academic staff self-evaluations. |
| **`msp-support`** | **59 IT & Operations tools** (Zero CAF tools) | Tier 1/2 IT Support Agents (`POST /mcp`); technician triage, RMM, and host remediation. |
| **`all`** *(default)* | **66 All tools** | Administrator oversight, unified diagnostics, and full developer testing. |

> **Hard Isolation Guarantee:** In Streamable HTTP mode, requests to `POST /mcp/caf` dynamically instantiate the server strictly in `caf-education` mode, ensuring that educational copilots and academic users have zero capability to execute remote PowerShell commands, query server databases, or view customer support tickets.

---

## Complete MCP Tools Catalog (66 Tools)

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
- **`msp_remote_get_hardware_components`**: Retrieves exhaustive physical hardware components (Motherboard, CPU cores, RAM modules, physical SSD/HDD drives, GPU adapters, Battery) directly from a remote workstation running `msp-agent` via SMBIOS/WMI.
- **`msp_remote_battery_report`**: Generates a detailed battery health analysis report (Design vs Full Charge Capacity, Cycle Count, Health %, Chemistry, Manufacturer) on remote endpoints via `powercfg /batteryreport`.
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

### 13. CAF Educational Quality & PII Privacy (7 Tools - `caf-education` profile)

- **`caf_configure_tenant_byok`**: Registers or updates private BYOK LLM credentials (OpenAI, Anthropic, or custom local endpoints) and model preferences for an educational institution with an isolated privacy partition.
- **`caf_get_tenant_byok_status`**: Inspects tenant BYOK configuration, active LLM provider, and privacy partition status without exposing secret keys.
- **`caf_audit_evidence`**: Audits institutional educational documents and records against the 9 CAF criteria with tenant-isolated PII sanitization (Dominican Law 172-13) and BYOK LLM evaluation.
- **`caf_analyze_survey_sentiment`**: Analyzes stakeholder satisfaction surveys (Students, Teachers, Parents) with tenant-isolated PII redaction and computes quantitative impact scores for CAF Criteria 6 & 7.
- **`caf_detect_documentary_gaps`**: Identifies documentary non-compliance, missing records, and evidence gaps against the 9 CAF criteria.
- **`caf_generate_improvement_plan`**: Generates the formal Institutional Improvement Plan (PMI) with SMART actions, indicators, timelines, and roles based on CAF audit findings.
- **`caf_anonymize_text`**: Demonstrates and verifies local in-memory PII sanitization under Dominican Law 172-13 with optional tenant partition.

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

Runs standard input/output JSON-RPC stream for Antigravity, Claude Desktop, Cursor, etc. Supports CLI flags `--caf`, `--msp`, or `--all`.

Configured in `C:\Users\PC\.gemini\config\mcp_config.json`:

```json
{
  "mcpServers": {
    "msp-support": {
      "command": "node",
      "args": [
        "c:/Users/PC/Workspace/msp_client_portal/packages/mcp-server/dist/index.js",
        "--msp"
      ],
      "env": {
        "MSP_API_URL": "https://helpdesk.velmartech.com.do",
        "MSP_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    },
    "caf-quality": {
      "command": "node",
      "args": [
        "c:/Users/PC/Workspace/msp_client_portal/packages/mcp-server/dist/index.js",
        "--caf"
      ],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### 2. Stateless Streamable HTTP Transport (Serverless, Cloud & Edge)

Runs a standalone HTTP server handling single-roundtrip JSON-RPC streams:

```bash
# Start in Streamable HTTP Mode (default port 3005)
npm -w packages/mcp-server run start:http

# Development Mode with live watch
npm -w packages/mcp-server run dev:http
```

**Endpoints:**

- `POST https://helpdesk.velmartech.com.do/mcp`: Streamable HTTP MCP endpoint for IT Support (configured profile, timing-safe API key auth).
- `POST https://helpdesk.velmartech.com.do/mcp/caf`: **Strictly isolated** CAF Educational Quality Agent endpoint (zero IT tools, 7 CAF & privacy tools only).
- `GET  https://helpdesk.velmartech.com.do/mcp` / `GET /health`: MCP server health and spec compliance diagnostics.
- `GET  https://helpdesk.velmartech.com.do/mcp/caf/health`: CAF isolated endpoint health probe.

---

## Microsoft Copilot Studio Agent Integrations

The server supports two distinct Copilot Studio deployment targets:

### Option A: MSP IT Support Tier-1/Tier-2 Agent (`/mcp`)

- **Server URL:** `https://helpdesk.velmartech.com.do/mcp`
- **Authentication:** `API key` (`Header: X-API-Key`)
- **Key Value:** Admin JWT token (`MSP_API_KEY`)
- **Runbook:** See [`docs/infrastructure/COPILOT_STUDIO_AGENT_DEPLOYMENT.md`](../../docs/infrastructure/COPILOT_STUDIO_AGENT_DEPLOYMENT.md).

### Option B: CAF Educational Quality AIaaS Agent (`/mcp/caf`)

- **Server URL:** `https://helpdesk.velmartech.com.do/mcp/caf`
- **Authentication:** `None` (Public academic endpoint; institution credentials are provided via BYOK headers or `caf_configure_tenant_byok`)
- **Tools Available:** Only the 7 educational quality and privacy tools (`caf_*`). IT support tools are completely unreachable.
- **Runbook:** See [`docs/infrastructure/COPILOT_STUDIO_CAF_AGENT_DEPLOYMENT.md`](../../docs/infrastructure/COPILOT_STUDIO_CAF_AGENT_DEPLOYMENT.md).

---

## Production Docker Deployment

The MCP server runs as container `msp_mcp_prod` within the `msp_portal` Docker Compose stack on the helpdesk VPS:

- **Image:** `msp_mcp_prod:latest` (built from `packages/mcp-server/Dockerfile`, Alpine Node.js 22 runtime).
- **Networks:** `default` (bridge) + `reverse-proxy` (Traefik ingress).
- **Ingress:** Traefik v3 terminates TLS for `https://helpdesk.velmartech.com.do/mcp` and routes all subpaths (including `/mcp/caf`) to internal port `3005`.
- **Environment:**
  - `MSP_SERVER_URL="helpdesk.velmartech.com.do"` (resolves to `https://helpdesk.velmartech.com.do/api/v1`)
  - `MSP_API_KEY=<JWT Admin Token>`
  - `MCP_SERVER_API_KEY=<Inbound Key>`
  - `MCP_TRANSPORT="http"`
  - `MCP_HTTP_PORT=3005`
  - `MCP_PROFILE="all"`

---

## Build & Test

```bash
# Build TypeScript bundle
npm -w packages/mcp-server run build

# Run comprehensive test suite (54+ unit & integration tests)
npm -w packages/mcp-server run test
```

