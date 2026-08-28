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
| `MSP_GATEWAY_URL` | `wss://helpdesk.velmartech.com.do/agent-ws` | WebSocket gateway URL |
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

## 🚀 Run & Service Management

### 1. Automatic Windows Background Service (Recommended)

Run PowerShell **as Administrator**:

```powershell
# 1. Install as an automatic Windows Service
# (Automatically relocates binary to 'C:\Program Files\MSP\msp-agent\' and sets up protected storage)
.\msp-agent.exe install

# 2. Start the background service immediately
.\msp-agent.exe start

# 3. Check service status (RUNNING / STOPPED)
.\msp-agent.exe status

# 4. View live service logs
.\msp-agent.exe log
```

#### Service Management Commands

| Command | Action |
| :--- | :--- |
| `.\msp-agent.exe install` | Relocates binary to `C:\Program Files\MSP\msp-agent\` and installs auto-start Windows Service |
| `.\msp-agent.exe start` | Starts the installed Windows background service |
| `.\msp-agent.exe status` | Displays current state (`RUNNING` / `STOPPED`) and PID |
| `.\msp-agent.exe log` | Displays the latest background service logs |
| `.\msp-agent.exe stop` | Stops the running background service |
| `.\msp-agent.exe uninstall` | Stops and removes the service from Windows |

### 2. Manual / Foreground Console Mode (Testing)

```powershell
$env:MSP_GATEWAY_URL = "ws://localhost:3001/agent-ws"
.\msp-agent.exe
```

When started unbound for the first time, it displays a **6-digit pairing code** with a 15-minute TTL. Enter this code into the MSP Client Portal to link the PC to its subscription slot.

---

## 📁 Protected System Paths

- **Binary**: `C:\Program Files\MSP\msp-agent\msp-agent.exe`
- **State & Identity**: `C:\ProgramData\MSP\msp-agent.json` (stores `instance_id`, `slot_id`, `agent_token`)
- **Service Log**: `C:\ProgramData\MSP\msp-agent.log`

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
