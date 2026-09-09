# Concept: Push-Button Self-Upgrading Windows Agent with Atomic Swap & Rollback

## Status
Refined (Phase 3 Idea Proposal - Ready for ADR / RFC)

## Date
2026-09-09

---

## 1. Problem Statement
Workstation endpoints running `msp-agent.exe` (Windows Service `MSPEndpointAgent`) currently have no built-in self-upgrade mechanism. Whenever new agent features, security hardening, or diagnostic capabilities are released (e.g. moving from `v1.7.1` to `v1.8.4` or `v1.10.2`), updating endpoints requires an MSP technician to manually remote into the target machine or coordinate third-party RMM scripts to stop the service, overwrite the binary, and restart it.

**How might we enable physical workstations running `msp-agent.exe` to autonomously self-upgrade over the existing WebSocket tunnel without manual technician intervention, third-party software dependencies, or risk of bricking the endpoint?**

---

## 2. Recommended Direction: Push-Button OTA with In-Process Atomic Move Swap & Auto-Rollback

We establish an Over-The-Air (OTA) upgrade pipeline driven either via the MSP Web Portal (Equipment Detail view) or directly through the MCP tool `msp_remote_upgrade_agent`. The upgrade flow coordinates between the Portal Backend, the existing WebSocket connection (`AgentGateway`), and the local `msp-agent` service.

```
┌─────────────────────────────────────────────────────────────┐
│               MSP Web Portal / AI Agent (MCP)               │
│  [Admin / MCP invokes upgrade] ──> POST /api/v1/equipment/:id/upgrade
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Backend Server                   │
│  1. Verifies admin / technician authorization               │
│  2. Resolves target binary release (version, URL, SHA-256)   │
│  3. AgentGateway.sendToAgent(equipmentId, {                 │
│       command: 'AGENT_UPGRADE',                             │
│       payload: {                                            │
│         target_version: '1.10.2',                           │
│         download_url: 'https://helpdesk.velmartech.com.do/dl/msp-agent-1.10.2.exe',
│         sha256_checksum: 'bf2b4d87...',                     │
│         rollback_timeout_secs: 45                           │
│       }                                                     │
│     })                                                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Outbound TLS WebSocket (/agent-ws)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Endpoint Machine (MSPEndpointAgent)             │
│  1. Service receives AGENT_UPGRADE frame                    │
│  2. Downloads new binary to C:\ProgramData\MSP\updates\     │
│  3. Verifies SHA-256 integrity hash                         │
│  4. Atomic Move Swap:                                       │
│     - MoveFile: msp-agent.exe -> msp-agent.exe.bak-v<cur>   │
│     - MoveFile: updates\staged.exe -> msp-agent.exe         │
│     - Writes C:\ProgramData\MSP\updates\upgrade_state.json  │
│  5. Self-Restarts Windows Service (or exits cleanly so SCM  │
│     restarts the new binary)                                │
│                                                             │
│  [Post-Restart Handshake Guard]:                            │
│  6. New binary boots; checks upgrade_state.json             │
│  7. Establishes TLS WebSocket handshake within 45s          │
│     - SUCCESS: Cleans up upgrade_state.json, logs OK        │
│     - FAILURE / CRASH: SCM or bootstrap helper detects      │
│       handshake timeout -> restores .bak-v<cur> -> restarts │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 In-Process Atomic Move Swap (Bypassing Windows File Locks)
Windows NTFS locks running executables against deletion and overwriting (`ERROR_SHARING_VIOLATION`), but **permits renaming of active binaries** within the same filesystem volume.
* The running agent renames its own file:
  `C:\Program Files\MSP\msp-agent\msp-agent.exe` $\rightarrow$ `msp-agent.exe.bak-v<previous>`
* Moves verified staged binary:
  `C:\ProgramData\MSP\updates\msp-agent-v<target>.exe` $\rightarrow$ `C:\Program Files\MSP\msp-agent\msp-agent.exe`
* Emits a final WebSocket confirmation: `UPGRADE_PREPARED`, then commands Windows SCM to restart `MSPEndpointAgent`.

### 2.2 Post-Restart Handshake Guard & Automated Instant Rollback
Upgrades must be self-healing if a release contains a broken network stack, missing dependency, or configuration incompatibility:
* Before initiating the swap, the agent writes a sentinel record `upgrade_state.json` containing `{ "previous_version": "1.7.1", "target_version": "1.10.2", "backup_path": "...", "deadline": <timestamp + 45s> }`.
* Upon restart, if the new binary successfully connects to `/agent-ws` and completes the TLS handshake, it removes `upgrade_state.json` and deletes the obsolete backup.
* If the handshake does not succeed before the 45-second deadline (or if the binary crashes during initialization), a tiny rollback monitor (invoked during restart) or the service entry point detects the uncommitted upgrade state, swaps `msp-agent.exe.bak-v<previous>` back into place, and restarts the stable service.

### 2.3 Identity & Credential Isolation
* Machine binding credentials stored in `C:\ProgramData\MSP\msp-agent.json` (`slot_id`, `agent_token`, `instance_id`) remain strictly untouched.
* The new binary immediately re-authenticates using the existing persistent token.

---

## 3. Key Assumptions to Validate

- [ ] **Windows `MoveFileEx` / `std::fs::rename` on Running Binary Under `SYSTEM`**: Confirm that `NT AUTHORITY\SYSTEM` in Session 0 can rename the executing binary inside `C:\Program Files\MSP\msp-agent\` and write a new binary to that same location without permissions errors.
- [ ] **WebSocket Handshake Latency Under 45s**: Confirm that low-bandwidth, high-latency customer endpoints can complete TLS handshake + token verification well within the 45-second rollback window.
- [ ] **SCM Restart Trigger**: Confirm whether Windows Service Manager restart is cleanly accomplished via `windows_service` crate or an exit code restart policy.

---

## 4. MVP Scope

### In Scope
- **Agent WebSocket Command (`packages/msp-agent`):**
  - Implement handler for `AGENT_UPGRADE` in `main.rs` and `service.rs`.
  - Staging directory management in `C:\ProgramData\MSP\updates\`.
  - Streaming HTTPS download with `reqwest`.
  - SHA-256 verification using Rust `sha2`.
  - Atomic rename-swap logic (`MoveFileExW` / `std::fs::rename`).
  - Upgrade sentinel state persistence (`upgrade_state.json`).
  - 45-second watchdog handshake commit and automated rollback on failure.
- **Backend API & Orchestration (`server` & `@shared/contracts`):**
  - Contract schema: `AgentUpgradePayloadSchema` (`targetVersion`, `downloadUrl`, `sha256Checksum`, `rollbackTimeoutSecs`).
  - Controller endpoint: `POST /api/v1/equipment/:id/upgrade`.
  - Gateway message dispatch via `AgentGateway.sendToAgent(equipmentId, { command: "AGENT_UPGRADE", ... })`.
- **MCP Tooling (`packages/mcp-server`):**
  - Add tool `msp_remote_upgrade_agent(equipment_id, target_version)` allowing Copilot Studio and autonomous agents to trigger verified fleet updates.
- **Web Portal UI (`client`):**
  - Add "Update Agent" action in Equipment Detail / RMM view when agent version is behind the latest release.

### Not Doing (and Why)
- **Always-Running Daemon Watchdog Service:** Excluded. Running a second permanent Windows Service (`MSPWatchdog`) adds process clutter, memory overhead, and duplicate maintenance surfaces. The in-process rename swap with sentinel state verification eliminates the need for a secondary daemon.
- **Full MSI Package Re-installation over OTA:** Excluded. Re-running MSI installers requires Windows Installer service locking (`msiexec.exe`), disrupts registry entries, and frequently hangs in Session 0. Direct binary hot-swap is instantaneous and deterministic.
- **Unsupervised Auto-Cron Upgrades:** Excluded. MSP endpoints should only be upgraded on demand (push-button or scheduled maintenance window) to avoid taking physical endpoints offline during critical business hours.
- **P2P Local Subnet Caching:** Excluded for MVP. All binaries download directly over TLS from the primary portal distribution endpoint.

---

## 5. Architectural Implementation Slices

### Slice 1: Rust Endpoint Hot-Swap & Rollback Engine (`packages/msp-agent`)
1. Create `packages/msp-agent/src/upgrade.rs`:
   - `download_and_verify(url, sha256) -> Result<PathBuf>`
   - `atomic_swap(new_binary_path, backup_path) -> Result<()>`
   - `commit_upgrade()` & `rollback_if_uncommitted()`
2. Add `AGENT_UPGRADE` envelope command handler in `main.rs`.
3. Wire service restart via SCM.

### Slice 2: Backend Orchestration & Contract Schemas
1. Define shared contract in `@shared/contracts`: `AgentUpgradeRequestSchema`, `AgentUpgradeResponseSchema`.
2. Add `AgentGateway.sendUpgradeCommand(slotId, payload)` in `server/src/modules/rmm/`.
3. Expose route `POST /api/v1/equipment/:id/upgrade`.

### Slice 3: MCP Server & Web Portal Controls
1. Register `msp_remote_upgrade_agent` in `packages/mcp-server/src/index.ts`.
2. Update portal equipment table/card to show update indicator and trigger action.

---

## 6. Open Questions
1. **Code Signing (Authenticode):** Should future iterations enforce Windows Authenticode signature validation (`WinVerifyTrust`) in addition to SHA-256 hash pinning?
2. **Bandwidth Throttling:** Do customer sites with multiple endpoints require download rate limiting or staggered rollout groups to prevent WAN congestion during mass upgrades?
