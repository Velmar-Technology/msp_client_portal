# MSP Endpoint Agent (`msp-agent`)

Lightweight, native Rust background agent installed on client endpoints. Establishes a persistent outbound WebSocket tunnel to the MSP Backend Gateway, enabling technicians to execute real-time diagnostics, event log queries, security posture audits, and service remediation commands — all without opening inbound firewall ports on the client network.

---

## 🏗️ Architecture

```
Client PC (msp-agent.exe)  ───[Outbound WSS]───►  MSP Backend (/agent-ws)  ◄───[REST/MCP]───  Technician AI
```

The agent makes an **outbound** TLS WebSocket connection, so it works behind NAT, corporate firewalls, and VPNs without any port-forwarding configuration.

---

## ⚙️ Configuration

All configuration is via environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `MSP_GATEWAY_URL` | `ws://localhost:3001/agent-ws` | WebSocket gateway URL |
| `MSP_AGENT_ID` | *(auto-generated UUID)* | Equipment UUID from the MSP Portal |
| `MSP_AGENT_TOKEN` | `dev-token` | Pre-shared secret for authentication |
| `MSP_RECONNECT_DELAY` | `5` | Initial reconnection delay (seconds) |
| `MSP_MAX_RECONNECT_DELAY` | `120` | Maximum reconnection delay ceiling |

---

## 🔧 Build

### Prerequisites
- [Rust 1.75+](https://rustup.rs/)

### Debug Build
```powershell
cd packages/msp-agent
cargo build
```

### Release Build (Optimized, ~3MB binary)
```powershell
cargo build --release
```

The compiled binary is at `target/release/msp-agent.exe`.

---

## 🚀 Run

### Manual (foreground)
```powershell
$env:MSP_GATEWAY_URL = "wss://api.yourmsp.com/agent-ws"
$env:MSP_AGENT_ID = "equipment-uuid-from-portal"
$env:MSP_AGENT_TOKEN = "your-agent-secret-token"
.\target\release\msp-agent.exe
```

### Install as Windows Service
```powershell
sc.exe create "MSP Endpoint Agent" binpath="C:\MSP\msp-agent.exe" start=auto
sc.exe description "MSP Endpoint Agent" "Velmar Technology MSP remote diagnostics agent"
sc.exe start "MSP Endpoint Agent"
```

Set environment variables via the registry for the service:
```powershell
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\MSP Endpoint Agent"
New-ItemProperty -Path $regPath -Name Environment -Value @(
    "MSP_GATEWAY_URL=wss://api.yourmsp.com/agent-ws",
    "MSP_AGENT_ID=equipment-uuid",
    "MSP_AGENT_TOKEN=secret-token"
) -PropertyType MultiString -Force
```

---

## 📡 Supported Commands

| Command | Description |
| :--- | :--- |
| `DIAGNOSE_PC` | Full CPU, RAM, Disk, Network, OS snapshot |
| `GET_EVENT_LOGS` | Windows Event Viewer query (Application/System) |
| `SECURITY_AUDIT` | BitLocker, Defender, Firewall, Reboot status |
| `RESTART_SERVICE` | Restart a Windows service by name |
| `INSPECT_OPEN_PORTS` | List all listening TCP ports and processes |
| `LIST_STARTUP_PROGRAMS` | Autorun / startup registry entries |
| `FLUSH_DNS_RENEW_DHCP` | Flush DNS cache and renew DHCP lease |
| `PING` | Health check / heartbeat response |

---

## 🔒 Security Notes

- The agent only makes **outbound** connections — no listening ports are opened.
- Agent authentication uses a pre-shared token validated by the backend gateway.
- Dangerous service restarts (`WinDefend`, `TrustedInstaller`, `wuauserv`) are blocked by policy.
- All communication is encrypted via TLS when using `wss://`.
