# Task List: msp-tray Endpoint Logging Architecture (Completed)

## Phase 1: Rust Core Rolling Logger & Sanitizer

### Task 1.1: Implement `logger.rs` with Rolling File Appender & Data Redaction
**Description:** Build `packages/msp-tray/src-tauri/src/logger.rs` providing `log_file_path()` resolving to `%LOCALAPPDATA%\MSP\logs\msp-tray.log` (overridable via `MSP_TRAY_LOG`), a `RollingFileWriter` with 5 MB threshold and 3 rolling generations (`msp-tray.log`, `msp-tray.log.1`, `msp-tray.log.2`), and sensitive data masking for pairing codes and tokens.
**Acceptance criteria:**
- [x] Resolves `%LOCALAPPDATA%\MSP\logs\msp-tray.log` safely creating the parent directory if missing.
- [x] Overridable via `MSP_TRAY_LOG` environment variable for tests and development.
- [x] Rotates log files when size exceeds 5,242,880 bytes (5 MB), keeping max 3 historical archives.
- [x] Redacts pairing codes (`[A-Z0-9]{6}`) and Bearer auth tokens from log strings.
**Verification:**
- [x] Unit tests in `logger.rs` verify rotation and redaction mechanics.
**Dependencies:** None
**Files touched:**
- `packages/msp-tray/src-tauri/src/logger.rs`
**Estimated scope:** Medium (1 file)

---

### Task 1.2: Integrate Logger Bootstrap & Instrument IPC Lifecycle
**Description:** Initialize the rolling logger in `packages/msp-tray/src-tauri/src/lib.rs` and instrument the IPC loop in `packages/msp-tray/src-tauri/src/ipc.rs` with throttled connection retry logging and explicit diagnostics.
**Acceptance criteria:**
- [x] Logger initialized at application bootstrap in `lib.rs`.
- [x] Reconnection attempts in `ipc.rs` are logged cleanly without filling disk when service is offline (throttled).
- [x] Named pipe connected, disconnected, frame deserialize error events include timestamps and tags.
**Verification:**
- [x] Cargo check / build succeeds.
**Dependencies:** Task 1.1
**Files touched:**
- `packages/msp-tray/src-tauri/src/lib.rs`
- `packages/msp-tray/src-tauri/src/ipc.rs`
**Estimated scope:** Small (2 files)

---

### Task 1.3: Rust Unit Tests for Logger Mechanics
**Description:** Add comprehensive unit tests in `logger.rs` testing path resolution, multi-step rolling file rotation, and credential redaction.
**Acceptance criteria:**
- [x] Test validates file size trigger rotates files in order (.log -> .log.1 -> .log.2).
- [x] Test validates pairing code and token masking.
- [x] Test validates directory fallback when env var is absent.
**Verification:**
- [x] `cargo test` in `packages/msp-tray/src-tauri` passes (6/6 tests ok).
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `packages/msp-tray/src-tauri/src/logger.rs`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Rust Core
- [x] Rust code builds cleanly.
- [x] Unit tests pass for rotation and redaction.

---

## Phase 2: Tauri IPC Command Bridge & Client Service

### Task 2.1: Implement Tauri Diagnostic Commands
**Description:** Expose `log_client_event`, `get_tray_log_info`, and `open_tray_log_dir` in `packages/msp-tray/src-tauri/src/lib.rs` and register them in the Tauri invoke handler.
**Acceptance criteria:**
- [x] `log_client_event(level: String, message: String, stack: Option<String>)` writes `[WEBVIEW] [LEVEL]` to the log file.
- [x] `get_tray_log_info()` returns `{ path: String, exists: bool, sizeBytes: u64 }`.
- [x] `open_tray_log_dir()` opens the enclosing log directory in the OS file explorer.
- [x] All three commands registered in `tauri::generate_handler!`.
**Verification:**
- [x] Cargo test / check succeeds.
**Dependencies:** Phase 1
**Files touched:**
- `packages/msp-tray/src-tauri/src/lib.rs`
**Estimated scope:** Small (1 file)

---

### Task 2.2: Implement TypeScript Tauri Bridge & Unit Tests
**Description:** Add typed functions `logClientEvent`, `getTrayLogInfo`, and `openTrayLogDir` in `packages/msp-tray/src/services/tauri.ts` with browser mock fallbacks and unit tests in `tauri.test.ts`.
**Acceptance criteria:**
- [x] Export `logClientEvent(level, message, stack?)`, `getTrayLogInfo()`, and `openTrayLogDir()`.
- [x] Fallback gracefully when running outside Tauri environment.
- [x] Unit tests in `tauri.test.ts` verify command invocation payloads and fallback behavior.
**Verification:**
- [x] `npm -w @packages/msp-tray run test:run` passes.
**Dependencies:** Task 2.1
**Files touched:**
- `packages/msp-tray/src/services/tauri.ts`
- `packages/msp-tray/src/services/tauri.test.ts`
**Estimated scope:** Small (2 files)

---

## Checkpoint: Bridge
- [x] TypeScript types and mocks verified.
- [x] Frontend can invoke logging commands without errors.

---

## Phase 3: Frontend Error Trapping & Drawer Diagnostics UI

### Task 3.1: Implement React ErrorBoundary & Global Window Listeners
**Description:** Implement `ErrorBoundary.tsx` component and register `window.onerror` and `window.onunhandledrejection` handlers in `main.tsx` to automatically forward uncaught exceptions to `logClientEvent`.
**Acceptance criteria:**
- [x] `ErrorBoundary` wraps main application and renders a recovery view if a fatal render error occurs.
- [x] Render error message and component stack are forwarded to `logClientEvent('error', ...)`.
- [x] Global unhandled promise rejection listener logs to `logClientEvent('warn', ...)`.
**Verification:**
- [x] Vitest tests verify `ErrorBoundary` catches errors and triggers `logClientEvent`.
**Dependencies:** Phase 2
**Files touched:**
- `packages/msp-tray/src/components/ErrorBoundary.tsx`
- `packages/msp-tray/src/components/ErrorBoundary.test.tsx`
- `packages/msp-tray/src/main.tsx`
**Estimated scope:** Medium (3 files)

---

### Task 3.2: Add "View Logs" Action in Drawer Header
**Description:** Add a compact diagnostic button/menu item in `packages/msp-tray/src/components/Header.tsx` allowing the user or support engineer to open the log folder or copy the log path.
**Acceptance criteria:**
- [x] Subtle icon button (`FileText`) in drawer Header.
- [x] Clicking invokes `openTrayLogDir()` to view diagnostic logs in Windows Explorer.
- [x] Respects existing compact styling and i18n keys (`openLogsTooltip` in `en_US` and `es_DO`).
**Verification:**
- [x] Header renders cleanly and unit tests pass.
**Dependencies:** Task 2.2
**Files touched:**
- `packages/msp-tray/src/components/Header.tsx`
- `packages/msp-tray/src/i18n/types.ts`
- `packages/msp-tray/src/i18n/locales/en_US.ts`
- `packages/msp-tray/src/i18n/locales/es_DO.ts`
**Estimated scope:** Small (3 files)

---

## Checkpoint: Complete Verification
- [x] All tests pass: `npm -w @packages/msp-tray run test:run` (62 tests passing).
- [x] Full build succeeds: `npm -w @packages/msp-tray run build`.
