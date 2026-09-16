# Implementation Plan: msp-tray Endpoint Logging Architecture (Completed)

## Overview
Implement persistent, size-capped rolling endpoint logging for `msp-tray` on Windows desktop endpoints. The logger records Rust backend lifecycle, Named Pipe IPC connection/retry events, and React Webview unhandled errors into `%LOCALAPPDATA%\MSP\logs\msp-tray.log` (capped at 5 MB, with 3 rotated backups), featuring sensitive credential redaction and a diagnostics menu option for support.

## Architecture Decisions
- **Storage Location:** `%LOCALAPPDATA%\MSP\logs\msp-tray.log` (creates parent directory automatically). Overridable via `MSP_TRAY_LOG` env var for testing. This avoids Windows UAC permissions issues when running as a standard desktop user.
- **Rotation Strategy:** Custom rolling file writer checking file size upon write. When exceeding 5 MB ($\approx 5 \times 10^6$ bytes), rotates `msp-tray.log.2` (delete), `msp-tray.log.1 -> msp-tray.log.2`, `msp-tray.log -> msp-tray.log.1`, and re-opens fresh `msp-tray.log`.
- **Sensitive Data Redaction:** Substring/regex masks pairing codes (e.g. `[A-Z0-9]{6}`), Bearer/JWT tokens, and passwords prior to disk persistence.
- **Frontend Error Forwarding:** Tauri command `log_client_event` bridges React Webview unhandled errors and `ErrorBoundary` crashes into the same rolling log tagged `[WEBVIEW]`.
- **Supportability:** Exposes `open_tray_log_dir` and `get_tray_log_info` to allow the user or on-site technician to inspect logs directly from the tray drawer.

## Task List

### Phase 1: Rust Core Rolling Logger & Sanitizer
- [x] Task 1.1: Implement `logger.rs` with rolling file writer, size checks, and sensitive data redaction.
- [x] Task 1.2: Integrate logger bootstrap in `lib.rs` and instrument IPC lifecycle in `ipc.rs`.
- [x] Task 1.3: Unit tests for path resolution, rotation mechanics, and data redaction.

### Checkpoint: Rust Core
- [x] Rust code builds cleanly.
- [x] Unit tests pass for rotation and redaction.

### Phase 2: Tauri IPC Command Bridge & Client Service
- [x] Task 2.1: Add Tauri commands `log_client_event`, `get_tray_log_info`, and `open_tray_log_dir` in `lib.rs`.
- [x] Task 2.2: Add TypeScript bindings and unit tests in `packages/msp-tray/src/services/tauri.ts` and `tauri.test.ts`.

### Checkpoint: Bridge
- [x] TypeScript types and mocks verified.
- [x] Frontend can invoke logging commands without errors.

### Phase 3: Frontend Error Trapping & Drawer Diagnostics UI
- [x] Task 3.1: Create `ErrorBoundary.tsx` and global unhandled error handlers in `packages/msp-tray/src/`.
- [x] Task 3.2: Add "Open Logs" action / diagnostic info in tray drawer UI.
- [x] Task 3.3: Vitest tests for `ErrorBoundary` and error capture.

### Checkpoint: Complete Verification
- [x] All tests pass (`npm -w @packages/msp-tray run test:run`).
- [x] Build succeeds (`npm -w @packages/msp-tray run build`).

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Disk I/O blocking UI thread | Medium | Use synchronous write behind a mutex or buffered writer with short flush duration; disk writes are minimal outside errors. |
| High IPC retry log spam during agent service downtime | High | Throttle repeated reconnect warning logs after first 3 attempts until next state change. |
| Chat message PII leaked to disk | Critical | Ticket chat payloads are excluded from log statements; regex filter strips credentials. |
