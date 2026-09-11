# Task List: Workstation Activation Gate for MSP Endpoint Suite

## Phase 1: Agent IPC & Binding Event Bus

### Task 1.1: Enhance Agent IPC Status & Refresh Protocol
**Description:** Update `GET_AGENT_STATUS` in `packages/msp-agent/src/ipc_server.rs` to include `isBound`, `pairingCode`, and `pairingCodeExpiresAt`, and implement the `REFRESH_PAIRING_CODE` IPC command handler.
**Acceptance criteria:**
- [x] In `packages/msp-agent/src/ipc_server.rs`, `GET_AGENT_STATUS` response payload includes `isBound: bool`, `pairingCode: Option<String>`, and `pairingCodeExpiresAt: Option<String>` derived from `AgentState`.
- [x] Add handler for `REFRESH_PAIRING_CODE` IPC request that issues a fresh pairing code via `state.issue_pairing_code()`, saves it, and responds with the updated code and expiration.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` succeeds with exit code 0.
- [x] `cargo test --manifest-path packages/msp-agent/Cargo.toml` passes.
**Dependencies:** None
**Files touched:**
- `packages/msp-agent/src/ipc_server.rs`
**Estimated scope:** Small (1 file)

---

### Task 1.2: Broadcast `AGENT_BOUND` down IPC Named Pipe
**Description:** In `packages/msp-agent/src/main.rs`, emit a real-time IPC push broadcast whenever the agent transitions to bound or unbound state.
**Acceptance criteria:**
- [x] In `handle_bind()` in `packages/msp-agent/src/main.rs`, after persisting state, call `ipc_server::broadcast_push_event("AGENT_BOUND", &json!({ "slotId": slot_id, "boundAt": chrono::Utc::now().to_rfc3339() }))`.
- [x] In `handle_unbind()`, call `ipc_server::broadcast_push_event("AGENT_UNBOUND", &json!({ "pairingCode": new_code, "expiresAt": state.pairing_code_expires_at }))`.
**Verification:**
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` succeeds.
- [x] Unit tests for binding state in `packages/msp-agent/src/pairing.rs` pass.
**Dependencies:** Task 1.1
**Files touched:**
- `packages/msp-agent/src/main.rs`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Agent Protocol Ready
- [x] Agent IPC server compiles cleanly with new fields and commands
- [x] Agent unit tests pass with zero regressions

---

## Phase 2: Tray Tauri IPC Client & Service Types

### Task 2.1: Update Tauri Rust IPC Models & Refresh Command
**Description:** Update `AgentStatusPayload` in `packages/msp-tray/src-tauri/src/ipc.rs` and expose a new Tauri command `refresh_pairing_code` to allow the desktop GUI to request a fresh OTP over named pipe.
**Acceptance criteria:**
- [x] Update `AgentStatusPayload` in `packages/msp-tray/src-tauri/src/ipc.rs` to include `is_bound: bool`, `pairing_code: Option<String>`, and `pairing_code_expires_at: Option<String>` with proper `serde(rename = "...")`.
- [x] Implement `refresh_pairing_code` IPC client method and expose it as a Tauri `#[tauri::command]` in `packages/msp-tray/src-tauri/src/lib.rs`.
- [x] Forward `AGENT_BOUND` IPC push notifications as Tauri window events (`agent://bound`).
**Verification:**
- [x] `cargo check --manifest-path packages/msp-tray/src-tauri/Cargo.toml` compiles with 0 errors.
**Dependencies:** Task 1.1
**Files touched:**
- `packages/msp-tray/src-tauri/src/ipc.rs`
- `packages/msp-tray/src-tauri/src/lib.rs`
**Estimated scope:** Medium (2 files)

---

### Task 2.2: TypeScript Service Types & Event Listeners
**Description:** Update `AgentStatus` interface in `packages/msp-tray/src/services/tauri.ts` and provide wrapper methods for code refresh and bound event listening.
**Acceptance criteria:**
- [x] Extend `AgentStatus` interface in `packages/msp-tray/src/services/tauri.ts` with `isBound: boolean`, `pairingCode?: string`, and `pairingCodeExpiresAt?: string`.
- [x] Export `refreshPairingCode(): Promise<AgentStatus>` invoking the Tauri command.
- [x] Export `listenAgentBound(callback: (payload: { slotId: string }) => void): Promise<UnlistenFn>`.
**Verification:**
- [x] TypeScript typecheck passes in `packages/msp-tray`: `npm --prefix packages/msp-tray run build`.
**Dependencies:** Task 2.1
**Files touched:**
- `packages/msp-tray/src/services/tauri.ts`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Tray IPC Layer Tested
- [x] Tauri Rust crate builds cleanly
- [x] TypeScript types align 100% with Rust payload serialization

---

## Phase 3: Tray UI Activation Gate & App Integration

### Task 3.1: Build `<ActivationGate />` Component
**Description:** Create a dedicated, aesthetically polished workstation pairing card in `packages/msp-tray/src/components/ActivationGate.tsx`.
**Acceptance criteria:**
- [x] Displays prominent 6-digit pairing code formatted as `123 - 456` with high-contrast typography and subtle letter-spacing.
- [x] One-click "Copy Code" button with instant visual feedback badge (`Copied!`).
- [x] Dynamic countdown timer showing time until expiration (e.g. `Expires in 14:32`), turning amber/red as time runs out.
- [x] "Generate New Code" button with spinning refresh state calling `refreshPairingCode()`.
- [x] Plain-language instructions for end-users on sharing the code with their IT department or entering it in the portal.
**Verification:**
- [x] Component compiles cleanly with Tailwind v4 styling and Lucide icons.
**Dependencies:** Task 2.2
**Files touched:**
- `packages/msp-tray/src/components/ActivationGate.tsx`
**Estimated scope:** Medium (1 new file)

---

### Task 3.2: Integrate Gate & Dynamic Unlocking in `App.tsx`
**Description:** Update `packages/msp-tray/src/App.tsx` to conditionally render `<ActivationGate />` when `agentStatus && !agentStatus.isBound`, block quick-ticket creation while unbound, and subscribe to `listenAgentBound` for live unlocking.
**Acceptance criteria:**
- [x] When `agentStatus?.isBound === false`, display `<ActivationGate />` instead of standard ticket/support tabs.
- [x] Disallow opening the Quick Ticket modal (`isTicketModalOpen`) when unbound.
- [x] Subscribe to `listenAgentBound`: on event received, play `playNotificationChime()`, reload agent status, and seamlessly transition into the unlocked workspace without requiring a tray restart.
**Verification:**
- [x] `npm --prefix packages/msp-tray run build` compiles with 0 errors.
- [x] Vitest unit tests in `packages/msp-tray` pass cleanly.
**Dependencies:** Task 3.1
**Files touched:**
- `packages/msp-tray/src/App.tsx`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Frontend Integration Complete
- [x] Activation Gate renders correctly when agent is unbound
- [x] Real-time transition on binding verified
- [x] UI build passes with 0 errors

---

## Phase 4: Verification & End-to-End Validation

### Task 4.1: Rust Agent Unit Tests & Compilation
**Description:** Verify `msp-agent` compiles in release mode and all unit tests for pairing, IPC, and diagnostics pass.
**Acceptance criteria:**
- [x] `cargo test --manifest-path packages/msp-agent/Cargo.toml` passes 100%.
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` passes.
**Verification:**
- [x] Rust test suite output verified (17/17 tests passed).
**Dependencies:** Task 1.2
**Files touched:**
- None (verification)
**Estimated scope:** Verification (0 files modified)

---

### Task 4.2: Full Workspace Compilation & Monorepo Health Checks
**Description:** Verify monorepo packages, server, client, and tray packages compile cleanly without regressions.
**Acceptance criteria:**
- [x] `npm run build:packages` succeeds with code 0.
- [x] `npm -w server run test` passes without regression (83 test files, 815/815 tests passed).
- [x] `npm --prefix packages/msp-tray run build` passes with code 0.
- [x] `npm --prefix packages/msp-tray run test:run` passes with code 0 (49/49 tests passed).
**Verification:**
- [x] All automated quality gates pass green.
**Dependencies:** Task 3.2, Task 4.1
**Files touched:**
- None (verification)
**Estimated scope:** Verification (0 files modified)
