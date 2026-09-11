# Endpoint Logging Architecture for msp-tray

## Problem Statement
How might we provide persistent, rolling diagnostic logs for `msp-tray` on Windows endpoints so that desktop crashes, named pipe IPC disconnections, and Webview UI errors can be diagnosed reliably without elevation conflicts, disk bloat, or customer privacy leaks?

## Recommended Direction: Native Rolling File Sink with Sanitized Frontend Bridge
Implement a dedicated logging module in `packages/msp-tray/src-tauri` configured at application bootstrap:
1. **Target Directory:** `%LOCALAPPDATA%\MSP\logs\msp-tray.log` (creates folder if missing; falls back to current working directory if environment variable is unavailable; overridable via `MSP_TRAY_LOG`).
2. **Rotation Policy:** Max 5 MB file size with 3 rolling backups (`msp-tray.log`, `msp-tray.log.1`, `msp-tray.log.2`).
3. **Dual Ingestion:**
   - **Rust Backend:** Ingests all `log::info!`, `log::warn!`, `log::error!`, specifically instrumenting Named Pipe reader/writer lifecycles, IPC handshake, and process start/stop.
   - **React Drawer Bridge:** Exposes a `log_client_event` Tauri command. React wires into an `ErrorBoundary` and `window.onerror` / `unhandledrejection` handler to send frontend fatal errors to the Rust logger.
4. **Privacy / Redaction Filter:** A sanitization filter that strips pairing codes (e.g. `[A-Z0-9]{6}`), JWT auth tokens, and raw ticket chat message bodies from log lines before disk writes.

## Key Assumptions to Validate
- [ ] **Path Accessibility:** `%LOCALAPPDATA%\MSP\logs` is guaranteed writable without administrator elevation in standard enterprise GPO and restricted user environments.
- [ ] **Performance Impact:** Buffered disk writes and rotation checks do not cause UI stutter or delay tray drawer opening/closing.
- [ ] **Redaction Rigor:** Regex or substring sanitizers successfully mask sensitive fields without corrupting error stack traces.

## MVP Scope
- Initialize file logger in `packages/msp-tray/src-tauri/src/lib.rs` inside `.setup()` or `run()`.
- Rolling file appender with 5 MB cap and 3 rotation files.
- Replace uninitialized `env_logger` with rotating file logger + stdout.
- Instrument IPC named pipe reconnection loop, frame deserialization errors, and status polling in `ipc.rs`.
- Tauri command `log_client_error(level: String, message: String, stack: Option<String>)`.
- React `ErrorBoundary` and global window error listener in `packages/msp-tray/src/` dispatching to `logClientError`.
- Automatic redaction of pairing codes and authorization headers.

## Not Doing (and Why)
- **Writing to `C:\ProgramData\MSP\msp-tray.log`:** Avoided because non-elevated desktop users running `msp-tray` lack write permissions to `C:\ProgramData\MSP` by default unless explicitly granted by the installer.
- **Logging full ticket chat message payloads:** Omitted to prevent leaking customer private communications or passwords typed into chat on the local disk.
- **Automatic cloud crash uploading in v1:** Keeps the tray application completely independent of direct cloud API keys (adheres to ADR-005: all cloud communication stays brokered via `msp-agent`).
- **Verbose per-frame IPC trace logging:** Avoided to prevent log spam and disk thrashing during high-frequency system vitals sampling (CPU/RAM updates every 2 seconds).

## Open Questions
- Should the React drawer UI provide an endpoint menu option (e.g. "Open Log Folder" or "Copy Diagnostic Log") for the end-user when reporting an issue to support?
- Should `msp-agent`'s `msp_remote_diagnose_pc` MCP tool be granted a helper function in a future update to read the user's `msp-tray.log`?
