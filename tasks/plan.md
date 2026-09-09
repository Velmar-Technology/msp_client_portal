# Implementation Plan: MSP Agent Autonomous Self-Upgrade Mechanism (OTA Hot-Swap)

## Overview
Decomposition and implementation plan for the autonomous self-upgrade (OTA) mechanism in the Rust endpoint agent (`packages/msp-agent`, Windows Service `MSPEndpointAgent`). This equips MSP technicians and AI agents (via MCP and the Web Portal) to trigger secure, in-place binary upgrades over the existing TLS WebSocket connection (`/agent-ws`) using an in-process atomic move swap with automated rollback protection if the post-restart handshake fails.

---

## Architecture Decisions

1. **Windows File-Lock Avoidance via Atomic Move (`MoveFileExW` / `std::fs::rename`):**
   - Windows NTFS forbids deleting or overwriting actively running executables (`ERROR_SHARING_VIOLATION`), but permits renaming them within the same volume.
   - The running service renames its own executing binary `msp-agent.exe` $\rightarrow$ `msp-agent.exe.bak-v<cur>`, moves the staged replacement into `msp-agent.exe`, and restarts the Windows Service.

2. **Handshake Sentinel Guard & Automated Rollback (`upgrade_state.json`):**
   - Before swapping, the agent records an upgrade transaction in `C:\ProgramData\MSP\updates\upgrade_state.json` with a 45-second rollback deadline.
   - Upon restart, the new binary boots:
     - **Success:** Once the TLS WebSocket connection to `/agent-ws` is authenticated, the agent commits the upgrade by deleting `upgrade_state.json` and cleaning up the previous `.bak` binary.
     - **Failure / Crash / Timeout:** If the handshake fails or times out, the service restores `msp-agent.exe.bak-v<cur>` and restarts the stable predecessor.

3. **Multi-Channel Orchestration (Web Portal & MCP Tool):**
   - Upgrades can be commanded visually via the Portal Equipment Detail view or conversationally via Copilot Studio / LLMs using the MCP tool `msp_remote_upgrade_agent`.
   - The backend validates technician/admin permissions, resolves binary download URLs & SHA-256 integrity hashes, and dispatches the payload via `AgentGateway.sendCommand`.

---

## Task List

### Phase 1: Shared API Contracts & Backend Gateway Orchestration
- [ ] Task 1.1: Define Agent Upgrade API Contracts in `@shared/contracts`
- [ ] Task 1.2: Implement Backend Upgrade Endpoint in `rmm.routes.ts` & `AgentGatewayController.ts`
- [ ] Task 1.3: Add Backend Unit Tests for Agent Upgrade Dispatch in `AgentGateway.test.ts`
- [ ] Checkpoint 1: Backend Contracts & Endpoint Green

### Phase 2: Rust Endpoint Hot-Swap Engine & Rollback Guard (`packages/msp-agent`)
- [ ] Task 2.1: Add Upgrade Module with Streaming HTTPS Download & SHA-256 Verification in Rust
- [ ] Task 2.2: Implement In-Process Atomic Move Swap & Sentinel State (`upgrade_state.json`)
- [ ] Task 2.3: Implement Windows SCM Self-Restart & Post-Restart Handshake Rollback Watchdog
- [ ] Task 2.4: Wire `AGENT_UPGRADE` WebSocket Message Handler in `main.rs`
- [ ] Checkpoint 2: Agent Compilation & Local Rust Test Validation

### Phase 3: MCP Tooling & Portal Integration
- [ ] Task 3.1: Add `upgradeAgent` in `MspApiClient.ts` and Register `msp_remote_upgrade_agent` MCP Tool
- [ ] Task 3.2: Add MCP Tool Unit Tests in `tools.test.ts`
- [ ] Task 3.3: Web Portal UI Trigger & Version Badging in `client`
- [ ] Checkpoint 3: Full End-to-End Monorepo Quality Gates (`npm run build:packages`, `server build`, `client build`)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Windows NTFS Permission Error:** `SYSTEM` service unable to rename executing binary. | High | Validated: Windows kernel permits renaming open executables on NTFS as long as directory write permissions exist, which Session 0 `NT AUTHORITY\SYSTEM` possesses. |
| **Post-Upgrade Network Handshake Flapping:** High network latency causing false-positive rollback at 45s. | Medium | Configurable `rollback_timeout_secs` in payload (default 45s, extensible up to 120s for satellite/cellular endpoints). |
| **Corrupted Binary Download:** Incomplete file download resulting in a non-starting binary. | High | Mandatory SHA-256 checksum verification before initiating any file moves. If hash mismatches, update aborts immediately with an error log. |
| **Tampered Update URL (MITM):** Insecure download payload injected. | Critical | Download URL must be HTTPS only; binary integrity is verified against expected SHA-256 generated server-side. |

---

## Open Questions
- None. Requirements, failure modes, and architectural boundaries are fully resolved in [`docs/ideas/msp-agent-self-upgrade.md`](file:///c:/Users/PC/Workspace/msp_client_portal/docs/ideas/msp-agent-self-upgrade.md).
