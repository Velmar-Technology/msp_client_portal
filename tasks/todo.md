# Tasks: Prevent Rate Limit Re-accumulation

## Task 1: Update `gatewayRateLimiterMiddleware.ts` to isolate agent traffic
**Description:** Modify `server/src/shared/middleware/gatewayRateLimiterMiddleware.ts` to detect machine-authenticated requests (checking path `/tickets/agent`, headers `x-agent-instance-id`, or machine auth bearer tokens) and partition their rate-limiting key to `ratelimit:agent:<id>` with dedicated thresholds, preventing machine requests from exhausting the human portal browser IP bucket (`ratelimit:gw:<ip>`).

**Acceptance criteria:**
- [x] Requests to `/api/v1/tickets/agent/*` or containing agent identifiers generate keys with `ratelimit:agent:` prefix.
- [x] Browser requests continue using tenant ID or IP fallback (`ratelimit:gw:`).
- [x] Dedicated windowMs and maxRequests applied for agent traffic (e.g., 120 req / 5m).
- [x] JSDoc updated with `@see BL-103`.

**Verification:**
- [x] Types compile cleanly (`npm -w server run build`)

**Dependencies:** None
**Files likely touched:**
- `server/src/shared/middleware/gatewayRateLimiterMiddleware.ts`
**Estimated scope:** Small (1 file)

---

## Task 2: Add unit tests in `gatewayMiddleware.test.ts`
**Description:** Add test cases in `server/src/shared/middleware/gatewayMiddleware.test.ts` verifying that agent traffic is partitioned from normal tenant/IP gateway limits and that exhausting the agent limit does not block human browser requests from the same IP.

**Acceptance criteria:**
- [x] Tests verify agent key generation with `ratelimit:agent:` prefix.
- [x] Tests verify cross-isolation: agent traffic hitting its quota does not 429-lock the browser gateway key.
- [x] All tests pass cleanly.

**Verification:**
- [x] Tests pass: `npm -w server run test src/shared/middleware/gatewayMiddleware.test.ts`

**Dependencies:** Task 1
**Files likely touched:**
- `server/src/shared/middleware/gatewayMiddleware.test.ts`
**Estimated scope:** Small (1 file)

---

### Checkpoint: Gateway
- [x] Gateway tests pass cleanly (9 tests green)
- [x] Server build succeeds cleanly

---

## Task 3: Implement exponential backoff and circuit breaker in `ipc_server.rs`
**Description:** Update `packages/msp-agent/src/ipc_server.rs` to implement an exponential backoff circuit breaker when fetching tickets via HTTP fails with 401 Unauthorized, 404 Not Found, or connection errors.

**Acceptance criteria:**
- [x] Exponential backoff starting at 30s up to 15m with jitter.
- [x] Consecutive failures trip circuit breaker to state `Open`.
- [x] While `Open`, returns immediate cached failure/empty response to local named pipe clients without firing outbound HTTP requests.
- [x] Resets on manual refresh trigger or successful pairing event.

**Verification:**
- [x] `cargo check --manifest-path packages/msp-agent/Cargo.toml` succeeds.

**Dependencies:** None
**Files likely touched:**
- `packages/msp-agent/src/ipc_server.rs`
**Estimated scope:** Medium (1-2 files)

---

## Task 4: Add local caching for un-paired state in endpoint agent
**Description:** If `slot_id` is missing or un-paired in `msp-agent.json`, suppress automatic ticket list polling entirely and emit an `UNPAIRED` status over the IPC pipe to the tray application.

**Acceptance criteria:**
- [x] Agent checks if `slot_id` is blank or unconfirmed before scheduling recurring HTTP queries.
- [x] IPC server responds to tray with `Unpaired` state.
- [x] Outbound network traffic to `/tickets/agent/*` is zero when un-paired.

**Verification:**
- [x] Unit check in Rust agent or local log verification.

**Dependencies:** Task 3
**Files likely touched:**
- `packages/msp-agent/src/ipc_server.rs`
**Estimated scope:** Small (1 file)

---

### Checkpoint: Agent
- [x] Rust agent compiles cleanly without warnings or errors (`Finished dev profile target(s) in 18.02s`).

---

## Task 5: Add `TICKETS_QUERY` and `TICKETS_SNAPSHOT` in `AgentGateway.ts`
**Description:** Introduce WebSocket ticket tunneling in `server/src/modules/rmm/services/AgentGateway.ts`. When an online agent sends a `TICKETS_QUERY` message over the established WebSocket tunnel, query the ticket repository/service and return a lightweight `TICKETS_SNAPSHOT` response.

**Acceptance criteria:**
- [x] Handles incoming `TICKETS_QUERY` message type in `AgentGateway`.
- [x] Dispatches ticket query for the authenticated `equipmentId` / `tenantId`.
- [x] Sends `TICKETS_SNAPSHOT` frame back through the active WebSocket connection.
- [x] Zero HTTP requests required for online agents.

**Verification:**
- [x] Build compiles: `npm -w server run build`

**Dependencies:** Task 1
**Files likely touched:**
- `server/src/modules/rmm/services/AgentGateway.ts`
**Estimated scope:** Small (1 file)

---

## Task 6: Add unit tests in `AgentGateway.test.ts`
**Description:** Author unit tests verifying that `AgentGateway` handles `TICKETS_QUERY` frames, interacts with the ticket service, and sends `TICKETS_SNAPSHOT` frames back over the socket.

**Acceptance criteria:**
- [x] Unit test verifies `TICKETS_QUERY` message processing.
- [x] Unit test verifies error handling when ticket lookup fails.
- [x] All tests in `AgentGateway.test.ts` pass green (39 tests).

**Verification:**
- [x] Tests pass: `npm -w server run test src/modules/rmm/services/AgentGateway.test.ts`

**Dependencies:** Task 5
**Files likely touched:**
- `server/src/modules/rmm/services/AgentGateway.test.ts`
**Estimated scope:** Small (1 file)

---

### Checkpoint: WebSocket Tunnel
- [x] RMM gateway test suite passes (39 tests passed).
- [x] Server build succeeds cleanly.

---

## Task 7: Local Host Re-pairing & Verification
**Description:** Bind the local machine's configuration (`C:\ProgramData\MSP\msp-agent.json`) to the user's active tenant equipment slot (`c8dfea5b-a2c3-4315-95ed-233e83be8ecc`), restart `MSPEndpointAgent`, and verify that the endpoint connects cleanly with zero 429 rate limit accumulation.

**Acceptance criteria:**
- [x] `slot_id` in `msp-agent.json` updated to valid active slot.
- [x] `MSPEndpointAgent` running and reports Online (`online: true`).
- [x] `msp_list_connected_agents` returns 1 online agent (`DEV-PC-1`, Lenovo 20LD001HUS).
- [x] `ratelimit:gw:186.6.42.61` does not surge (verified at 0/1000).

**Verification:**
- [x] MCP tool `msp_list_connected_agents` executes cleanly without 429 rate limit errors.
- [x] MCP tool `msp_remote_diagnose_pc` executes live telemetry command in 963ms.
- [x] Redis ZCARD check confirms portal quota is healthy (0/1000).

**Dependencies:** Tasks 1-6
**Files likely touched:**
- `C:\ProgramData\MSP\msp-agent.json`
**Estimated scope:** XS (1 file)

---

### Checkpoint: Complete Verification
- [x] All 7 tasks completed
- [x] DoD satisfied
