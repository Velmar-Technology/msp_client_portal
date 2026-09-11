# Unified MSI Packaging & Dual-Channel Upgrades for MSP Agent & Tray Assistant

## Status
Refined (Phase 3 Idea Proposal - Ready for Implementation)

## Date
2026-09-11

---

## 1. Problem Statement
Workstation endpoints running `msp-agent.exe` (Windows Service `MSPEndpointAgent`) and `msp-tray.exe` (Tauri Desktop Companion) are currently distributed as standalone binaries wrapped in a zip bundle (`build-installer.ps1`). This creates significant operational hurdles for MSP technicians and IT administrators:
- Enterprise deployment tools like Microsoft Intune, Active Directory Group Policy (GPO), and professional RMMs (Datto, NinjaOne) mandate standard `.msi` packages for silent mass deployment (`msiexec /i ... /qn`) with centralized compliance tracking.
- Upgrading currently requires manual PowerShell scripting or in-process binary replacement, bypassing the Windows Installer database (`msidb`) and leaving the Add/Remove Programs (ARP) registry un-versioned.
- Running `msp-tray.exe` in interactive user sessions while the background agent runs in Session 0 requires a reliable per-machine registration that launches at user logon and cleanly handles binary file locks during upgrades.

**How might we package the MSP Endpoint Agent and MSP Support Tray into a single enterprise-grade MSI installer with dual-channel silent upgrade capabilities, so that IT administrators can deploy and update thousands of endpoints via Intune, GPO, RMM, or Web Portal push with zero end-user disruption?**

---

## 2. Recommended Direction: WiX Toolset Unified Suite MSI with Detached Session 0 Upgrade Supervisor

We consolidate both `packages/msp-agent` and `packages/msp-tray` into a single WiX-based Windows Installer package (`msp-endpoint-suite.msi`).

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Deployment Vector Options                   │
│   [Option A: Intune / GPO / RMM]     [Option B: Web Portal] │
│     msiexec /i msp-suite.msi /qn        OTA AGENT_UPGRADE   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           WiX Unified Installer Engine (Windows Installer)  │
│  - Installs to %ProgramFiles%\MSP\EndpointSuite\            │
│  - Registers & Starts Service: MSPEndpointAgent             │
│  - Registers HKLM Run Key: msp-tray.exe                     │
│  - Sets %ProgramData%\MSP\msp-agent.json config             │
│  - WixCloseApplication: Gracefully closes active msp-tray   │
│  - MajorUpgrade: Auto-uninstalls previous versions          │
└─────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│  Session 0 (SYSTEM)     │           │  Session 1+ (User)      │
│  msp-agent.exe (Service)│ <──IPC──> │  msp-tray.exe (Desktop) │
└─────────────────────────┘           └─────────────────────────┘
```

### 2.1 Package Topology: Single Unified MSI (`msp-endpoint-suite.msi`)
- **Installation Target:** `%ProgramFiles%\MSP\EndpointSuite\`
  - `msp-agent.exe` (installed and managed via WiX `<ServiceInstall>` & `<ServiceControl>`)
  - `msp-tray.exe` (installed per-machine for all users)
- **User Session Auto-Launch:** Configured via `HKLM\Software\Microsoft\Windows\CurrentVersion\Run` to ensure any logged-in user on the workstation has the support assistant active in their system tray.
- **Machine State Isolation:** Device pairing tokens, hardware IDs, and logs in `%ProgramData%\MSP\` are flagged as permanent, ensuring upgrades and minor repairs never unpair the endpoint from the MSP Portal.
- **File-Lock Prevention:** Utilizes WiX `<util:CloseApplication>` targeting `msp-tray.exe` with a 5-second graceful window prior to file replacement, avoiding `ERROR_SHARING_VIOLATION` (MSI Error 1603) and reboot requests.

### 2.2 Dual-Channel Upgrade Engine
1. **Push-Button Web Portal / MCP OTA Upgrades:**
   - The running `msp-agent` receives an `AGENT_UPGRADE` WebSocket payload referencing the target `.msi` URL and SHA-256 hash.
   - Downloads and verifies the package into `%ProgramData%\MSP\updates\msp-endpoint-suite-v<version>.msi`.
   - Spawns a detached execution supervisor via Windows API (`CREATE_BREAKAWAY_FROM_JOB` or `cmd.exe /c start "" msiexec.exe /i "<msi>" /qn /norestart /l*v "%ProgramData%\MSP\updates\upgrade.log"`).
   - Agent notifies portal with `UPGRADE_STAGED` and shuts itself down cleanly, allowing `msiexec` to acquire the service lock, perform the upgrade, and restart `MSPEndpointAgent`.
2. **Enterprise Policy / Intune / GPO Upgrades:**
   - Standard WiX `<MajorUpgrade>` with `Schedule="afterInstallInitialize"` allows enterprise sysadmins to push new versions via standard Group Policy or Intune Win32 App supersedence without running custom scripts.

---

## 3. Key Assumptions to Validate
- [ ] **Detached Process Execution Under SYSTEM:** Verify that `msiexec.exe` launched detached from the Rust agent service continues execution and succeeds after `MSPEndpointAgent` stops.
- [ ] **Silent Tray Termination & Relaunch:** Validate that closing `msp-tray.exe` during silent upgrade (`/qn`) completes without user intervention or hung processes.
- [ ] **ProgramData Token Preservation:** Verify that upgrading from version `v1.8.4` to `v1.9.0` retains `msp-agent.json` and device credentials without requiring re-pairing.

---

## 4. MVP Scope

### In Scope
- **WiX Installer Project (`packages/msp-installer`):**
  - Author WiX XML (`Product.wxs`) with components for `msp-agent.exe`, `msp-tray.exe`, service registration, Run key, and `MajorUpgrade`.
  - Support public CLI properties: `GATEWAY_URL`, `AGENT_TOKEN`, `PAIRING_CODE`.
- **Automated Portable Packaging Script (`scripts/build-installer-msi.ps1`):**
  - Compiles release binaries for both Rust agent and Tauri tray companion.
  - Automatically downloads portable WiX binaries if WiX is not present on the host system.
  - Compiles and links the final `msp-endpoint-suite.msi`.
- **Detached OTA In-Service Supervisor (`packages/msp-agent/src/upgrade.rs`):**
  - Support `.msi` file download, checksum verification, and detached execution of `msiexec /i ... /qn`.
- **Shared API Contracts & Backend Updates:**
  - Update `AgentUpgradePayloadSchema` to support package format specification (`installerType: 'msi' | 'binary'`).

### Not Doing (and Why)
- **Per-User AppData Installation:** Excluded. Causes permission mismatches when non-admin users log into shared corporate workstations. Installing to `Program Files` ensures all users have access to the tray tool.
- **Dynamic Server-Side MSI Generation:** Excluded. Generates significant server load and requires Windows build tooling on the backend server. Standard MSI public parameters achieve zero-touch configuration.
- **Burn EXE Bootstrapper:** Excluded for MVP. Raw `.msi` is the preferred artifact for enterprise Intune and GPO deployment.

---

## 5. Open Questions
1. **Code Signing:** Enterprise production deployments will require an Authenticode certificate for SmartScreen suppression; unsigned testing will run with developer execution flags.
2. **Tray Immediate Relaunch:** After silent MSI upgrade in Session 0, should the MSI use a custom action to relaunch `msp-tray.exe` in the current active user session immediately, or rely on the next user login?
