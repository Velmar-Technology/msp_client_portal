# Implementation Plan: Unified MSI Packaging & Dual-Channel Upgrades for MSP Endpoint Suite

## Overview
Package the Rust-based background Windows service (`msp-agent`) and the React/Tauri desktop assistant (`msp-tray`) into an enterprise-standard Windows Installer package (`msp-endpoint-suite.msi`). This enables automated, silent deployment via Microsoft Intune, Active Directory Group Policy (GPO), and enterprise RMM tools, while empowering endpoints to perform dual-channel silent upgrades—either driven centrally by the MSP Web Portal over WebSocket or through enterprise policy distribution.

---

## Architecture Decisions

1. **Single Unified MSI Topology (`packages/msp-installer`):**
   - Combines `msp-agent.exe` (Windows Service: `MSPEndpointAgent`, automatic startup) and `msp-tray.exe` (user-session companion) into `%ProgramFiles%\MSP\EndpointSuite\`.
   - Adds `HKLM\Software\Microsoft\Windows\CurrentVersion\Run` key to ensure `msp-tray.exe` launches automatically for any user logging into the machine.
   - Preserves `%ProgramData%\MSP\msp-agent.json` across upgrades so machine authentication and device pairing are never lost.

2. **Self-Contained WiX Toolset Pipeline (`scripts/build-suite-msi.ps1`):**
   - Uses standard WiX v3/v4 XML authoring (`Product.wxs`).
   - Automatically bootstraps portable WiX binaries (`candle.exe` & `light.exe`) if WiX is not globally installed in the developer/CI environment.
   - Integrates with top-level `npm run build:installer` command.

3. **Graceful File-Lock Prevention on Upgrades:**
   - Incorporates WiX `<util:CloseApplication>` targeting `msp-tray.exe` with a 5-second graceful termination window before file replacement, preventing MSI Error 1603 (`ERROR_SHARING_VIOLATION`) and suppressing reboot prompts.

4. **Detached Session 0 OTA Upgrade Engine (`packages/msp-agent`):**
   - Extends `packages/msp-agent/src/upgrade.rs` to detect `.msi` payloads.
   - Downloads and verifies SHA-256 integrity into `%ProgramData%\MSP\updates\`.
   - Executes `msiexec.exe /i "<msi>" /qn /norestart /l*v "%ProgramData%\MSP\updates\upgrade.log"` as a detached, breakaway process in Session 0.
   - Exits the running agent service cleanly to release service locks and allow Windows Installer to stop and replace the binaries seamlessly.

5. **Shared API Contracts & Backend Gateway Compatibility:**
   - Updates `AgentUpgradePayloadSchema` in `@shared/contracts` to support package format (`installerType: 'msi' | 'binary'`).
   - Updates `AgentGateway` and RMM controller to serve MSI release metadata to connected agents.

---

## Risk Analysis & Mitigations

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Deadlock if service terminates while parent to `msiexec` | High | Launch `msiexec` detached with `CREATE_BREAKAWAY_FROM_JOB` via `cmd.exe /c start` before service stops. |
| `msp-tray.exe` running in user session blocks file overwrite | High | WiX `CloseApplication` signals tray to close; fallback installer script checks and stops active processes. |
| Loss of agent device token/config on MSI major upgrade | Critical | Mark `%ProgramData%\MSP\` components as `Permanent="yes"` and omit them from uninstallation tables. |
| Missing WiX CLI on build agent | Medium | Build script automatically fetches portable WiX binaries into `.tools/wix/` if absent. |

---

## Task Breakdown Index

### Phase 1: Shared Contracts & Backend Upgrade Support
- [ ] Task 1.1: Shared Contract Updates for MSI Release Payloads
- [ ] Task 1.2: Server AgentGateway & Equipment Controller Upgrade Resolution
- **Checkpoint: Contracts & Server Readiness**

### Phase 2: Agent Detached MSI Supervisor
- [ ] Task 2.1: Rust Agent `.msi` Download & Detached Process Execution
- [ ] Task 2.2: Unit & Integration Tests for Agent Upgrade Dispatcher
- **Checkpoint: Agent Service Ready for MSI OTA**

### Phase 3: WiX Packaging Authoring & Automation
- [ ] Task 3.1: WiX Manifest Authoring (`Product.wxs`) for Unified Suite
- [ ] Task 3.2: Portable WiX Automated Build Script (`scripts/build-suite-msi.ps1`)
- **Checkpoint: Automated MSI Generation Verified**

### Phase 4: Verification & End-to-End Validation
- [ ] Task 4.1: End-to-End Silent Install & Upgrade Verification (`/qn`)
- [ ] Task 4.2: Full Monorepo Typecheck & Build Suite Verification
- **Checkpoint: Feature Complete**
