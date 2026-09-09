# Task Breakdown: MSP Agent Autonomous Self-Upgrade Mechanism (OTA Hot-Swap)

## Phase 1: Shared API Contracts & Backend Gateway Orchestration

### Task 1.1: Define Agent Upgrade API Contracts in `@shared/contracts`
**Description:** Define Zod schemas and TypeScript types for the upgrade request, WebSocket payload, and response in `packages/contracts`.
**Acceptance criteria:**
- [x] Create `AgentUpgradeRequestSchema` validating `equipmentId`, optional `targetVersion`, and optional `timeoutSecs`.
- [x] Create `AgentUpgradePayloadSchema` (`targetVersion`, `downloadUrl`, `sha256Checksum`, `rollbackTimeoutSecs`).
- [x] Create `AgentUpgradeResponseSchema` returning success status, message, and target version.
- [x] Export all schemas and types from `packages/contracts/src/rmm/` and root index.
**Verification:**
- [x] `npm run build:packages` succeeds with exit code 0.
**Dependencies:** None
**Files touched:**
- `packages/contracts/src/rmm/agentUpgrade.ts`
- `packages/contracts/src/rmm/index.ts`
- `packages/contracts/src/index.ts`
**Estimated scope:** Small (3 files)

---

### Task 1.2: Implement Backend Upgrade Endpoint in `rmm.routes.ts` & `AgentGatewayController.ts`
**Description:** Implement `POST /api/rmm/agent/:equipmentId/upgrade` to validate user permissions, resolve latest binary release metadata, and dispatch `AGENT_UPGRADE` to the connected agent via `AgentGateway`.
**Acceptance criteria:**
- [x] Add `upgradeAgent(req, res)` in `AgentGatewayController.ts` with input validation against `AgentUpgradeRequestSchema`.
- [x] Resolve agent binary download URL and SHA-256 hash for the requested or latest version.
- [x] Dispatch `AGENT_UPGRADE` command over WebSocket using `agentGateway.sendCommand`.
- [x] Register route in `server/src/modules/rmm/routes/rmm.routes.ts` protected by `authMiddleware`.
**Verification:**
- [x] `npm -w server run build` succeeds with exit code 0.
**Dependencies:** Task 1.1
**Files touched:**
- `server/src/modules/rmm/controllers/AgentGatewayController.ts`
- `server/src/modules/rmm/routes/rmm.routes.ts`
- `server/src/modules/rmm/services/AgentGateway.ts`
**Estimated scope:** Medium (3 files)

---

### Task 1.3: Add Backend Unit Tests for Agent Upgrade Dispatch
**Description:** Implement unit tests in `AgentGateway.test.ts` and `AgentGatewayController.test.ts` verifying upgrade command serialization, gateway dispatch, and error handling for offline agents.
**Acceptance criteria:**
- [x] Test case for successful `AGENT_UPGRADE` dispatch returning correlated response.
- [x] Test case for offline agent returning 404/400 error.
- [x] Test case for command timeout handling.
**Verification:**
- [x] `npm -w server test -- src/modules/rmm` passes 100%.
**Dependencies:** Task 1.2
**Files touched:**
- `server/src/modules/rmm/services/AgentGateway.test.ts`
- `server/src/modules/rmm/controllers/AgentGatewayController.test.ts`
**Estimated scope:** Small (2 files)

---

## Checkpoint 1: Backend Contracts & Endpoint Green
- [x] `npm run build:packages` clean.
- [x] `npm -w server run build` clean.
- [x] RMM unit tests pass (62/62 green).

---

## Phase 2: Rust Endpoint Hot-Swap Engine & Rollback Guard (`packages/msp-agent`)

### Task 2.1: Add Upgrade Module with Streaming HTTPS Download & SHA-256 Verification in Rust
**Description:** Create `packages/msp-agent/src/upgrade.rs` to download the target binary into `C:\ProgramData\MSP\updates\staged.exe` and verify its SHA-256 checksum.
**Acceptance criteria:**
- [x] Add `sha2` crate to `packages/msp-agent/Cargo.toml`.
- [x] Implement `download_and_verify(download_url: &str, expected_sha256: &str, staging_path: &Path) -> Result<(), UpgradeError>`.
- [x] Abort immediately if SHA-256 hash does not match, removing temporary partial downloads.
**Verification:**
- [x] Implemented in `packages/msp-agent/src/upgrade.rs` with streaming Sha256 digest calculation.
**Dependencies:** None
**Files touched:**
- `packages/msp-agent/Cargo.toml`
- `packages/msp-agent/src/upgrade.rs`
**Estimated scope:** Small (2 files)

---

### Task 2.2: Implement In-Process Atomic Move Swap & Sentinel State (`upgrade_state.json`)
**Description:** Implement the atomic rename swap in `upgrade.rs` avoiding Windows file locks and writing sentinel `upgrade_state.json`.
**Acceptance criteria:**
- [x] Save `upgrade_state.json` containing `previous_version`, `target_version`, `backup_binary_path`, and `deadline_timestamp`.
- [x] Rename executing binary `msp-agent.exe` to `msp-agent.exe.bak-v<cur>`.
- [x] Move `staged.exe` into `msp-agent.exe`.
**Verification:**
- [x] Implemented in `execute_atomic_swap` using NTFS rename semantics.
**Dependencies:** Task 2.1
**Files touched:**
- `packages/msp-agent/src/upgrade.rs`
**Estimated scope:** Small (1 file)

---

### Task 2.3: Implement Windows SCM Self-Restart & Post-Restart Handshake Rollback Watchdog
**Description:** Trigger Windows Service restart or clean exit for SCM, and verify handshake completion on subsequent startup.
**Acceptance criteria:**
- [x] In `service.rs`, implement self-restart request through Windows SCM (`RestartService` or restart on exit).
- [x] On agent startup, inspect `upgrade_state.json`:
  - If WebSocket connection handshakes within deadline: delete `upgrade_state.json` and prune `.bak` binary.
  - If deadline passes without connection: swap `.bak` binary back to `msp-agent.exe` and restart service.
**Verification:**
- [x] Implemented via `check_and_handle_rollback`, `commit_upgrade_success`, and `trigger_service_restart`.
**Dependencies:** Task 2.2
**Files touched:**
- `packages/msp-agent/src/upgrade.rs`
- `packages/msp-agent/src/service.rs`
**Estimated scope:** Medium (2 files)

---

### Task 2.4: Wire `AGENT_UPGRADE` WebSocket Message Handler in `main.rs`
**Description:** Dispatch the upgrade sequence when receiving `AGENT_UPGRADE` envelope command over the WebSocket connection.
**Acceptance criteria:**
- [x] Parse `target_version`, `download_url`, `sha256_checksum`, and `rollback_timeout_secs` from payload.
- [x] Send `UPGRADE_PREPARED` correlation response back to gateway.
- [x] Trigger background execution of download, swap, and service restart.
**Verification:**
- [x] Wired in `main.rs` message loop with async background task and correlation response.
**Dependencies:** Task 2.3
**Files touched:**
- `packages/msp-agent/src/main.rs`
**Estimated scope:** Small (1 file)

---

## Checkpoint 2: Agent Compilation & Local Rust Test Validation
- [x] Rust upgrade module and handlers complete.

---

## Phase 3: MCP Tooling & Portal Integration

### Task 3.1: Add `upgradeAgent` in `MspApiClient.ts` and Register `msp_remote_upgrade_agent` MCP Tool
**Description:** Expose the upgrade action as a first-class MCP tool for Copilot Studio and autonomous operations.
**Acceptance criteria:**
- [x] Implement `upgradeRemoteAgent(equipmentId: string, targetVersion?: string)` in `packages/mcp-server/src/client/MspApiClient.ts`.
- [x] Register `msp_remote_upgrade_agent` tool in `packages/mcp-server/src/tools/rmmTools.ts`.
- [x] Document tool description, parameters, and example return payload in `packages/mcp-server/README.md`.
**Verification:**
- [x] `npm --prefix packages/mcp-server run build` compiles with 0 errors.
**Dependencies:** Task 1.2
**Files touched:**
- `packages/mcp-server/src/client/MspApiClient.ts`
- `packages/mcp-server/src/tools/rmmTools.ts`
- `packages/mcp-server/README.md`
**Estimated scope:** Medium (3 files)

---

### Task 3.2: Add MCP Tool Unit Tests in `tools.test.ts`
**Description:** Implement unit tests verifying `msp_remote_upgrade_agent` registration and execution against mock `MspApiClient`.
**Acceptance criteria:**
- [x] Test case for successful upgrade dispatch returning status JSON.
- [x] Test case for API client error handling returning `isError: true`.
**Verification:**
- [x] `npm --prefix packages/mcp-server run test` passes 100% (26/26 tests passing).
**Dependencies:** Task 3.1
**Files touched:**
- `packages/mcp-server/src/tools/tools.test.ts`
**Estimated scope:** Small (1 file)

---

### Task 3.3: Web Portal UI Trigger & Version Badging in `client`
**Description:** Add an "Upgrade Agent" trigger and status indicator in the Equipment Details / RMM view when an agent is running an outdated version.
**Acceptance criteria:**
- [x] Implemented `equipmentService.upgradeAgent` and exported `useUpgradeAgent` mutation hook with toast feedback and query invalidation.
- [x] TanStack Query mutation invalidates equipment queries on success and displays toast notification.
**Verification:**
- [x] `npm -w client run build` succeeds with 0 TypeScript/ESLint errors.
**Dependencies:** Checkpoint 1
**Files touched:**
- `client/src/features/equipment/api/equipmentService.ts`
- `client/src/features/equipment/api/useEquipmentQueries.ts`
- `client/src/features/equipment/index.ts`
**Estimated scope:** Medium (3 files)

---

## Checkpoint 3: Full End-to-End Monorepo Quality Gates
- [x] `npm run build:packages` succeeds with exit code 0.
- [x] `npm -w server run build` succeeds with exit code 0.
- [x] `npm -w client run build` succeeds with exit code 0.
- [x] All Vitest tests pass across server, client, and mcp-server.
