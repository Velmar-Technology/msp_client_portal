# WireGuard & Infrastructure Automation Tooling

This directory contains Node.js automation and diagnostic scripts for managing the WireGuard tunnel and Nextcloud integration across the **Helpdesk VPS** (Portainer Endpoint 3) and **TrueNAS SCALE** (Portainer Endpoint 4).

---

## 🔒 Security Requirements

These scripts require environment variables to operate. **Never hardcode API keys or credentials directly in files.**

Set the required environment variables in your active shell session:

```powershell
$env:PORTAINER_URL = "https://helpdesk.velmartech.com.do:9443"
$env:PORTAINER_API_KEY = "<YOUR_PORTAINER_API_KEY>"
```

---

## 🛠️ Included Tools

| Script | Purpose | Usage |
|---|---|---|
| **`papi.mjs`** | Core Portainer REST client with multiplexed Docker exec stream demuxing | Library imported by other scripts |
| **`run-in.mjs`** | Execute commands inside any container across any Portainer endpoint | `node run-in.mjs <endpointId> <containerSubstring> <command...>` |
| **`probe-tunnel.mjs`** | Probe ping, TCP, and transfer byte metrics across the WireGuard interface | `node probe-tunnel.mjs` |
| **`poll-nas.mjs`** | Query container status on TrueNAS (Endpoint 4) with automated retry | `node poll-nas.mjs` |
| **`step7-verify-msp.mjs`** | Run end-to-end health checks against `msp_server_prod` | `node step7-verify-msp.mjs` |

---

## 📖 Complete Documentation

For the full architectural specification, network topologies, and operational runbooks, see:
[`docs/infrastructure/WIREGUARD_NEXTCLOUD_INTEGRATION.md`](../../docs/infrastructure/WIREGUARD_NEXTCLOUD_INTEGRATION.md).
