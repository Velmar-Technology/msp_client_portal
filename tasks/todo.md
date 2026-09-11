# Task List: Unified MSI Packaging & Dual-Channel Upgrades for MSP Endpoint Suite

## Phase 1: Shared Contracts & Backend Upgrade Support

### Task 1.1: Shared Contract Updates for MSI Release Payloads
**Description:** Update `AgentUpgradePayloadSchema` and related types in `@shared/contracts` to support package format specification (`installerType: 'msi' | 'binary'`).
**Acceptance criteria:**
- [x] Add `installerType: z.enum(['msi', 'binary']).default('msi')` to `AgentUpgradePayloadSchema` in `packages/contracts/src/rmm/agentUpgrade.ts`.
- [x] Export updated TypeScript types and ensure all consumers typecheck cleanly.
**Verification:**
- [x] `npm run build:packages` succeeds with exit code 0.
**Dependencies:** None
**Files touched:**
- `packages/contracts/src/rmm/agentUpgrade.ts`
**Estimated scope:** Small (1 file)

---

### Task 1.2: Server AgentGateway & Equipment Controller Upgrade Resolution
**Description:** Update server RMM agent gateway and equipment controller to support dispatching MSI upgrade commands with download URL and SHA-256 hash.
**Acceptance criteria:**
- [x] Update `EquipmentController.ts` / `AgentGatewayController.ts` upgrade dispatch logic to include `installerType: 'msi'`.
- [x] Update test fixtures and unit tests in `server/src/modules/rmm/`.
**Verification:**
- [x] `npm -w server run build` passes.
- [x] `npm -w server run test` passes without regression.
**Dependencies:** Task 1.1
**Files touched:**
- `server/src/modules/equipment/controllers/EquipmentController.ts`
- `server/src/modules/rmm/controllers/AgentGatewayController.ts`
- `server/src/modules/rmm/controllers/AgentGatewayController.test.ts`
**Estimated scope:** Medium (3 files)

---

## Checkpoint: Contracts & Server Readiness
- [x] Shared packages compile cleanly
- [x] Backend tests and builds pass 100%

---

## Phase 2: Agent Detached MSI Supervisor

### Task 2.1: Rust Agent `.msi` Download & Detached Process Execution
**Description:** Enhance `packages/msp-agent/src/upgrade.rs` to detect `.msi` package types, stage them in `%ProgramData%\MSP\updates\`, and launch `msiexec.exe /i "<msi>" /qn /norestart /l*v "upgrade.log"` detached using Windows process creation flags.
**Acceptance criteria:**
- [x] Implement `execute_msi_upgrade(msi_path: &Path) -> Result<(), String>` in `packages/msp-agent/src/upgrade.rs`.
- [x] Use detached command execution (`CREATE_BREAKAWAY_FROM_JOB` / `cmd.exe /c start`) so `msiexec` survives the calling service's shutdown.
- [x] Handle command dispatch in `packages/msp-agent/src/main.rs` upon receiving `AGENT_UPGRADE`.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` compiles cleanly.
- [x] Unit tests for upgrade argument parsing pass.
**Dependencies:** Task 1.1
**Files touched:**
- `packages/msp-agent/src/upgrade.rs`
- `packages/msp-agent/src/main.rs`
**Estimated scope:** Medium (2 files)

---

### Task 2.2: Unit & Integration Tests for Agent Upgrade Dispatcher
**Description:** Add unit tests for the agent upgrade staging, validation, and execution paths in Rust.
**Acceptance criteria:**
- [x] Write tests covering SHA-256 verification and command generation for MSI upgrades in `packages/msp-agent/src/upgrade.rs`.
- [x] Ensure non-Windows test mock branches pass cleanly.
**Verification:**
- [x] `cargo test --manifest-path packages/msp-agent/Cargo.toml` passes.
**Dependencies:** Task 2.1
**Files touched:**
- `packages/msp-agent/src/upgrade.rs`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Agent Service Ready for MSI OTA
- [x] Rust agent compiles cleanly in release mode
- [x] Rust unit tests pass

---

## Phase 3: WiX Packaging Authoring & Automation

### Task 3.1: WiX Manifest Authoring (`Product.wxs`) for Unified Suite
**Description:** Author the WiX XML manifest (`packages/msp-agent/installer/Product.wxs` or `packages/msp-installer/Product.wxs`) configuring the unified installation of `msp-agent.exe`, `msp-tray.exe`, service registration, Run key, and MajorUpgrade.
**Acceptance criteria:**
- [x] Define `<Package>` with target `%ProgramFiles%\MSP\EndpointSuite\`.
- [x] Configure `<ServiceInstall>` for `MSPEndpointAgent` with automatic startup and failure restart actions.
- [x] Configure `<ServiceControl>` to stop service on uninstall/upgrade and start on install/upgrade.
- [x] Configure `HKLM\Software\Microsoft\Windows\CurrentVersion\Run` key for `msp-tray.exe`.
- [x] Configure `<MajorUpgrade>` with `Schedule="afterInstallInitialize"` and persistent `UpgradeCode`.
- [x] Define public properties `GATEWAY_URL` and `AGENT_TOKEN` with safe defaults.
- [x] Add `WixCloseApplication` or custom action to close active `msp-tray.exe` prior to file overwrite.
**Verification:**
- [x] WiX schema validation succeeds.
**Dependencies:** Task 2.1
**Files touched:**
- `packages/msp-agent/installer/Product.wxs` (or new installer directory)
**Estimated scope:** Medium (1-2 files)

---

### Task 3.2: Portable WiX Automated Build Script (`scripts/build-suite-msi.ps1`)
**Description:** Write an automated PowerShell packaging script that builds `msp-agent` release binary, builds `msp-tray` release binary, automatically bootstraps portable WiX binaries if missing, and compiles the final `msp-endpoint-suite.msi`.
**Acceptance criteria:**
- [x] PowerShell script detects or auto-downloads portable WiX binaries (`candle.exe`/`light.exe`) into `.tools/wix/`.
- [x] Compiles `msp-agent` and `msp-tray` in release mode.
- [x] Invokes WiX compiler and linker to output `dist/msp-endpoint-suite-v<version>.msi`.
- [x] Add npm script `"build:installer"` in root `package.json`.
**Verification:**
- [x] Running script compiles and generates a valid `.msi` file in `dist/`.
**Dependencies:** Task 3.1
**Files touched:**
- `scripts/build-suite-msi.ps1`
- `package.json`
**Estimated scope:** Medium (2 files)

---

## Checkpoint: Automated MSI Generation Verified
- [x] `npm run build:installer` succeeds end-to-end and outputs `msp-endpoint-suite.msi`
- [x] MSI size and structure are within expected boundaries

---

## Phase 4: Verification & End-to-End Validation

### Task 4.1: End-to-End Silent Install & Upgrade Verification (`/qn`)
**Description:** Test silent installation, service registration, tray auto-start key, and version upgrade behavior using `msiexec.exe`.
**Acceptance criteria:**
- [x] Test silent install: `msiexec /i msp-endpoint-suite.msi /qn GATEWAY_URL="wss://localhost/agent-ws"`.
- [x] Verify `MSPEndpointAgent` service is registered and running.
- [x] Verify `msp-tray.exe` Run key exists in `HKLM`.
- [x] Verify upgrade replaces binaries cleanly without 1603 error or reboot request.
- [x] Verify uninstall removes binaries and service cleanly.
**Verification:**
- [x] Windows PowerShell validation script checks service and registry state.
**Dependencies:** Task 3.2
**Files touched:**
- `scripts/test-msi-install.ps1`
**Estimated scope:** Small (1 file)

---

### Task 4.2: Full Monorepo Typecheck & Build Suite Verification
**Description:** Run comprehensive workspace quality checks across packages, server, and client.
**Acceptance criteria:**
- [x] `npm run build:packages` succeeds with code 0.
- [x] `npm -w server run build` succeeds with code 0.
- [x] `npm -w client run build` succeeds with code 0.
- [x] `npm -w server run test` passes 100%.
- [x] `npm -w client run test:run` passes 100%.
**Verification:**
- [x] All CI and monorepo automated gates pass green.
**Dependencies:** Task 4.1
**Files touched:**
- Monorepo wide
**Estimated scope:** Verification (0 files modified)
