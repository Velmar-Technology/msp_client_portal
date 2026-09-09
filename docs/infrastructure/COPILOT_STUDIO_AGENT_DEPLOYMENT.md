# Deployment & Operations Guide: Microsoft Copilot Studio AI Agent & MCP Server

_Status: Deployed & Active · Last Verified: 2026-09-09 · Version: 1.0_

---

## 1. Overview & Architecture

This guide provides the complete end-to-end deployment runbook for integrating the **Model Context Protocol (MCP)** server ([`@msp/mcp-server`](../../packages/mcp-server/)) with **Microsoft Copilot Studio** to operate autonomous **Tier-1 / Tier-2 IT Support & Triage Agents**.

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Microsoft Copilot Studio                     │
│  - Agent: "MSP Tier-1/2 Support Agent"                      │
│  - Generative AI Orchestration (Dynamic Tool Calling)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Streamable HTTP (JSON-RPC)
                               │ Header: X-API-Key: <JWT_TOKEN>
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           VPS Public Ingress (Traefik v3.6.4)               │
│               https://helpdesk.velmartech.com.do/mcp         │
│          (Terminates TLS, Let's Encrypt `myresolver`)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ reverse-proxy Docker network
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Container: msp_mcp_prod (:3005)                  │
│  - Image: msp_mcp_prod:latest (Node.js 22 Alpine)           │
│  - Stateless Streamable HTTP Transport (MCP 2026-07-28 Spec)│
│  - Timing-Safe Inbound Auth (validateInboundApiKey)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal API Requests (REST)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         MSP Client Portal Backend (msp_server_prod)         │
│         Express 5 + PostgreSQL 16 + Redis + RMM Tunnel       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure & Ingress Specification

The MCP server runs as a managed container within the **`msp_portal`** stack (Stack ID **17**, Endpoint ID **3**) on Portainer CE (`https://helpdesk.velmartech.com.do:9443`):

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Public Endpoint** | `https://helpdesk.velmartech.com.do/mcp` | Traefik reverse proxy to `msp-mcp-svc:3005` |
| **Health Check URL** | `https://helpdesk.velmartech.com.do/mcp/health` | `GET /mcp` also returns `HTTP 200` health status |
| **Container Name** | `msp_mcp_prod` | Defined in [`docker-compose.prod.yml`](../../docker-compose.prod.yml) |
| **Image** | `msp_mcp_prod:latest` | Built from [`packages/mcp-server/Dockerfile`](../../packages/mcp-server/Dockerfile) |
| **Inbound Auth** | `X-API-Key` or `Authorization: Bearer <key>` | Timing-safe check against `MSP_API_KEY` |
| **Internal Transport** | Stateless Streamable HTTP | Per-request fresh transport per MCP specification |
| **Resource Limits** | CPU: `0.20`, Memory: `120M` | Reservation: CPU `0.01`, Memory `32M` |

---

## 3. Step-by-Step Copilot Studio Configuration

### Step 1: Create the Agent
1. Sign in to [Microsoft Copilot Studio](https://copilotstudio.microsoft.com/).
2. Click **Agents** in the left navigation and select **+ New agent**.
3. Set the agent details:
   - **Name:** `MSP Tier-1/2 Support Agent`
   - **Description:** `Assists MSP technicians and clients with real-time ticket diagnosis, RMM telemetry inspection, endpoint health checks, and guided remediation.`
   - **Primary Language:** `English` (supports multi-language responses dynamically).

### Step 2: Enable Generative Orchestration
> [!IMPORTANT]
> Copilot Studio **must** use generative orchestration to dynamically discover and invoke MCP tools based on user intent.

1. Go to **Settings** (gear icon) in the upper right.
2. Select **Generative AI**.
3. Under **How should your agent decide how to respond?**, select **Generative**.
4. Click **Save**.

### Step 3: Add the MCP Server Tool
1. In the **Build** tab, select **Tools** from the left panel.
2. Click **+ Add a tool** and select **Model Context Protocol (MCP)**.
3. Configure the server connection:
   - **Server name:** `MSPSupportMcp`
   - **Server description:** `Provides access to MSP portal tickets, RMM telemetry, remote endpoint agent commands, client equipment, and security audits.`
   - **Server URL:** `https://helpdesk.velmartech.com.do/mcp`
   - **Authentication:** Select **API key**
   - **Parameter type:** Select **Header**
   - **Header name:** `X-API-Key`
   - **Key value:** Paste your active portal API key or Admin JWT token.

### Step 4: Establish and Bind the Connection
1. After clicking **Add and configure**, Copilot Studio presents the **Select a connection** screen.
2. Click the dropdown next to **Connection** (showing `Not connected ⛔`).
3. Select **+ Create new connection**.
4. Paste your token when prompted and click **Create**.
5. Once the badge turns green (**Connected**), click the **Add** button in the bottom right.

### Step 5: Configure Master Agent Instructions
In the **Overview** > **Instructions** text area, paste the following system prompt:

```markdown
You are the Autonomous MSP Support & Operations Copilot for the MSP Client Portal (Velmar Technology).
Your primary role is to assist helpdesk technicians, dispatchers, and administrators in diagnosing issues, inspecting live RMM telemetry, triaging tickets, and safely applying endpoint remediations.

### 1. Master Tool Execution Workflows

#### A. Guided Ticket Triage & Diagnosis Workflow:
When a user asks to investigate, triage, or diagnose a ticket (by ID or description):
1. Call `msp_get_ticket` with the `ticketId` to fetch title, description, category, SLA deadlines, and linked equipment.
2. If an equipment ID is attached:
   - Call `msp_get_device_telemetry` to check live CPU, RAM, and Disk utilization.
   - Call `msp_list_device_patches` to see pending OS updates.
   - Call `msp_remote_agent_status` to verify if the Rust endpoint agent is online.
3. Synthesize your findings into a clear triage report:
   - Root Cause Hypothesis: Identify memory pressure, high CPU, disk full, or crash flags.
   - SLA & Priority Assessment: Verify if priority needs escalation.
   - Remediation Steps: Suggest specific manual actions or PowerShell fixes.
   - Draft both an internal technician note and a client-facing update.

#### B. Remote Diagnostics & Deep Inspection:
- If hardware or network performance issues are reported:
  - Call `msp_remote_diagnose_pc` for live metrics directly from the endpoint agent.
  - Call `msp_audit_network_interfaces` for Wi-Fi signal strength, Gateway latency, and DNS resolution.
  - Call `msp_analyze_disk_storage` to find large cache/temp directories.
- If application crashes are reported, call `msp_get_local_event_logs` or `msp_remote_get_event_logs` to check Windows Event Logs for faulting DLLs/modules.

#### C. Executive QBR & Health Audits:
When asked for client or tenant health summaries:
1. Call `msp_get_client_health` with the `tenantId` to retrieve the composite score (Ticket 40%, Hardware 30%, Security 30%).
2. Call `msp_get_client_equipment` to evaluate device lifecycle and aging hardware.
3. Summarize the grade, top 3 operational risks, and recommended roadmap.

---

### 2. Safety Rules & Confirmations

1. Destructive or Disruptive Actions Require Explicit Confirmation:
   - Before executing actions that affect running systems (such as `msp_restart_windows_service`, `msp_clean_temp_storage`, `msp_remote_exec_powershell`, or `msp_remote_exec_command`), ALWAYS state the exact command/service and ask the user for confirmation first.
2. 1-Hour Ticket Cancellation Rule (BL-101):
   - If asked to cancel a ticket, verify its creation time. WARRANTY and SERVICE_OUTAGE tickets can only be cancelled within 60 minutes of creation.
3. Privilege Elevation (BL-302):
   - For restricted administrative commands, check active grants via `msp_list_active_jit_grants` or advise the user to request Just-In-Time access using `msp_request_ephemeral_access`.

---

### 3. Response Format & Style

- Concise and Objective: State facts clearly without filler phrases.
- Tables for Telemetry: Present CPU, Memory, Disk, and Network stats in compact markdown tables.
- Actionable Next Steps: Always conclude diagnostic findings with 2-3 specific recommended actions.
```

---

## 4. MCP Tools Catalog (44+ Tools Registered)

| Category | Tools | Description |
| :--- | :--- | :--- |
| **Tickets & SLA** | `msp_get_ticket`, `msp_list_tickets`, `msp_add_ticket_reply`, `msp_update_ticket_status` | Full ticket lifecycle, thread messages, and SLA calculation (`BL-101`). |
| **RMM Telemetry** | `msp_get_device_telemetry`, `msp_list_device_patches`, `msp_get_device_maintenances` | Live hardware utilization, pending OS patches, and maintenance logs. |
| **Remote Agent Tunnel** | `msp_list_connected_agents`, `msp_remote_agent_status`, `msp_remote_diagnose_pc`, `msp_remote_get_event_logs`, `msp_remote_security_audit`, `msp_remote_exec_command`, `msp_remote_list_processes`, `msp_remote_exec_powershell` | Live bi-directional tunnel commands to enrolled Rust agents on client workstations. |
| **Inventory & Health** | `msp_list_clients`, `msp_get_client_equipment`, `msp_get_client_health`, `msp_get_device_components`, `msp_get_device_maintenance_report` | Multi-tenant hardware inventory, composite health score, and component auditing. |
| **Host Diagnostics** | `msp_diagnose_local_pc`, `msp_get_local_event_logs`, `msp_audit_security_posture`, `msp_inspect_open_ports`, `msp_list_startup_programs` | Local endpoint hardware metrics, event logs, BitLocker, Defender, TPM 2.0 status. |
| **Remediation** | `msp_restart_windows_service`, `msp_network_troubleshoot`, `msp_flush_dns_and_renew_dhcp`, `msp_clean_temp_storage` | Resolving frozen services, DNS/DHCP lease renewal, and disk cleanup. |
| **Zero Standing Privileges** | `msp_request_ephemeral_access`, `msp_list_active_jit_grants`, `msp_revoke_ephemeral_grant`, `msp_check_access_decision`, `msp_get_trust_score` | JIT privilege elevation, emergency break-glass, and Continuous Adaptive Trust (`BL-302`). |
| **Domain Services** | `msp_check_domain_services`, `msp_get_system_api_status` | DNS (A/MX/TXT), mail ports (25/587/993/995), HTTPS SSL certificates, platform health. |
| **Network & Storage** | `msp_audit_network_interfaces`, `msp_analyze_disk_storage` | Wi-Fi link speed, gateway ping, DNS resolution, and disk capacity hotspot analysis. |
| **Invoicing & Billing** | `msp_list_plans`, `msp_list_invoices`, `msp_get_invoice`, `msp_get_financial_stats`, `msp_list_expenses`, `msp_get_last_email`, `msp_list_notifications` | Billing plans, NCF tax breakdown, payment states, and notification delivery inspection. |

---

## 5. Live Verification Runbook

### Test 1: Verify Public Health & Liveness
```bash
curl -i https://helpdesk.velmartech.com.do/mcp
```
**Expected Response:** `HTTP/1.1 200 OK` with JSON metadata:
```json
{
  "status": "UP",
  "server": "msp-support-server",
  "version": "1.10.2",
  "spec": "MCP 2026-07-28 (Stateless Streamable HTTP)",
  "transport": "streamable-http"
}
```

### Test 2: Verify Inbound Authentication Gate
```bash
# Missing Key (Should Return 401)
curl -X POST https://helpdesk.velmartech.com.do/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# Valid Key (Should Return 200 Streamable Event)
curl -X POST https://helpdesk.velmartech.com.do/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-API-Key: <YOUR_MSP_API_KEY>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### Test 3: Interactive Copilot Studio Conversation Prompts
Test these directly in the Copilot Studio test canvas:
1. *"List all high-priority open tickets."*
   $\rightarrow$ Agent executes `msp_list_tickets({ status: "OPEN", priority: "HIGH" })`.
2. *"What is the hardware health of tenant Acme Logistics?"*
   $\rightarrow$ Agent executes `msp_get_client_health` and `msp_get_client_equipment`.
3. *"Check the print spooler on workstation WS-01."*
   $\rightarrow$ Agent queries service status and requests explicit confirmation before restarting.

---

## 6. Troubleshooting & Operational Runbook

### Issue 1: `HTTP 401 Unauthorized` in Copilot Studio
* **Root Cause:** The `X-API-Key` or `Authorization` header is missing or does not match `MSP_API_KEY` configured in the Portainer stack.
* **Resolution:** Ensure the connection credentials in Copilot Studio contain the exact active JWT token or API key.

### Issue 2: `HTTP 406 Not Acceptable`
* **Root Cause:** The client did not specify required streamable headers.
* **Resolution:** In Streamable HTTP, requests must include `Accept: application/json, text/event-stream`. Copilot Studio includes this automatically.

### Issue 3: Container Liveness or Restart Loop
* **Check Logs:**
  ```powershell
  # Inspect container logs on VPS via Portainer API or Dozzle (/logs)
  docker logs msp_mcp_prod --tail 50
  ```
* **Restart Container:**
  ```powershell
  docker restart msp_mcp_prod
  ```
