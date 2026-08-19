# MSP Support MCP Server (`@msp/mcp-server`)

Model Context Protocol (MCP) server providing LLMs (Antigravity, Claude Desktop, Cursor, Custom Agents) with real-time access to ticket diagnostics, live device RMM telemetry, hardware inventory, security posture auditing, automated remediation tools, and pre-packaged AI prompts.

---

## 🛠️ Complete MCP Tools Catalog (18 Tools)

### 1. 🎫 Ticket Diagnosis & Management
- **`msp_get_ticket`**: Fetches complete ticket details, conversation history, client info, SLA timers, and linked hardware asset.
- **`msp_list_tickets`**: Queries open/pending tickets filtered by tenant, status (`OPEN`, `IN_PROGRESS`, etc.), priority (`CRITICAL`, `HIGH`, etc.), or assigned technician.
- **`msp_add_ticket_reply`**: Posts internal triage notes (`isInternal: true`) or client-facing updates (`isInternal: false`).
- **`msp_update_ticket_status`**: Transitions ticket lifecycle status following SLA cancellation and transition matrix rules.

### 2. 💻 RMM Cloud Device Telemetry & Health
- **`msp_get_device_telemetry`**: Retrieves real-time CPU, RAM, Disk utilization, agent online status, and pending patch counts.
- **`msp_list_device_patches`**: Lists pending and installed OS patches with severity ratings.
- **`msp_get_device_maintenances`**: Inspects scheduled and past maintenance records.

### 3. 🏢 Inventory & Client Health
- **`msp_get_client_equipment`**: Lists registered workstations, servers, serial numbers, and activation status for a tenant.
- **`msp_get_client_health`**: Computes composite health score ($H = 0.40 \times S_{\text{ticket}} + 0.30 \times S_{\text{hardware}} + 0.30 \times S_{\text{security}}$).

### 4. 🖥️ Live Host Diagnostics & Event Logs
- **`msp_diagnose_local_pc`**: Direct host metrics: CPU model/cores, RAM usage %, all drive sizes/free space, and network adapters.
- **`msp_get_local_event_logs`**: Queries Windows Event Log (Application / System) for crashes and error codes.

### 5. 🛡️ Security & Endpoint Compliance
- **`msp_audit_security_posture`**: Audits BitLocker encryption, Windows Defender real-time protection, Firewall profiles, and reboot flags.
- **`msp_inspect_open_ports`**: Scans listening TCP ports and associated processes.
- **`msp_list_startup_programs`**: Audits autorun / startup registry applications.

### 6. ⚙️ Active Remediation & Network Troubleshooting
- **`msp_restart_windows_service`**: Restarts stuck Windows background services (Spooler, DNS, EDR, etc.).
- **`msp_network_troubleshoot`**: Tests Gateway latency, DNS resolution, and internet ping.
- **`msp_flush_dns_and_renew_dhcp`**: Flushes local DNS cache and renews DHCP lease.
- **`msp_clean_temp_storage`**: Calculates and purges Windows/User temp files and dump files with dry-run support.

---

## 📜 Built-In MCP Prompts

- **`triage_ticket`**: End-to-end guided ticket diagnosis workflow (ticket fetch $\rightarrow$ telemetry $\rightarrow$ event log inspection $\rightarrow$ root cause + response draft).
- **`qbr_executive_brief`**: Generates a complete executive Quarterly Business Review IT health presentation for client leadership.

---

## ⚙️ Configuration

Registered in `C:\Users\PC\.gemini\config\mcp_config.json`:

```json
{
  "mcpServers": {
    "msp-support": {
      "command": "node",
      "args": ["c:/Users/Public/Workspace/msp_client_portal/packages/mcp-server/dist/index.js"],
      "env": {
        "MSP_API_URL": "http://localhost:3000/api/v1"
      }
    }
  }
}
```
