# Task List: Scalable Backend Telemetry & Ingestion (5,000 Endpoints)

## Phase 1: Database Layer Fortification & Atomic Upserts (Quick Win)

### Task 1.1: Implement Atomic SQL Upsert & Batch Upsert in `RmmTelemetryRepository`
**Description:** Refactor `RmmTelemetryRepository.upsertTelemetry` to eliminate the two-step `SELECT` then `UPDATE`/`INSERT` query pattern. Replace it with a single atomic PostgreSQL `INSERT ... ON CONFLICT (equipment_id) DO UPDATE SET ...` using Drizzle's `.onConflictDoUpdate()`. Add `upsertTelemetryBatch` to support bulk writes of up to 500 records in a single roundtrip.
**Acceptance criteria:**
- [x] `upsertTelemetry` executes a single atomic SQL statement using `.onConflictDoUpdate({ target: rmmDeviceTelemetry.equipment_id, set: { ... } })`.
- [x] Correctly coalesces and sets metric values (`cpu_usage`, `memory_usage`, `disk_usage`, `disk_used_gb`, `disk_total_gb`, `pending_patch_count`, `agent_status`, `last_sync_at`, `updated_at`).
- [x] `upsertTelemetryBatch(records)` performs a chunked multi-row upsert.
**Verification:**
- [x] Unit tests pass: `npm -w server run test src/modules/rmm/repositories/RmmTelemetryRepository.test.ts`.
- [x] Build succeeds: `npm -w server run build`.
**Dependencies:** None
**Files touched:**
- `server/src/modules/rmm/repositories/RmmTelemetryRepository.ts`
**Estimated scope:** Small (1 file)

---

### Task 1.2: Add Compound Index on `rmm_device_telemetry` for Stale Sweeps
**Description:** Add a compound index `idx_rmm_telemetry_status_sync` on `(agent_status, last_sync_at)` in `server/src/shared/db/schema.ts` to accelerate scheduled offline sweeps (`last_sync_at < fifteenMinutesAgo AND agent_status = 'ONLINE'`) and avoid sequential scans across tens of thousands of telemetry records. Generate migration SQL.
**Acceptance criteria:**
- [x] Index defined on `rmmDeviceTelemetry` in `server/src/shared/db/schema.ts`.
- [x] Migration file `server/src/shared/db/migrations/046_add_rmm_telemetry_status_sync_index.sql` created.
**Verification:**
- [x] Build succeeds: `npm -w server run build`.
**Dependencies:** Task 1.1
**Files touched:**
- `server/src/shared/db/schema.ts`
- `server/src/shared/db/migrations/046_add_rmm_telemetry_status_sync_index.sql`
**Estimated scope:** Small (2 files)

---

### Task 1.3: Unit Tests for Atomic and Batch Upserts
**Description:** Create `server/src/modules/rmm/repositories/RmmTelemetryRepository.test.ts` to test atomic single and batch upsert query construction, conflict handling, and default values.
**Acceptance criteria:**
- [x] Tests verify single record upsert with missing optional fields properly defaults.
- [x] Tests verify batch upsert formats multiple values with conflict target.
**Verification:**
- [x] Vitest test passes: `npm -w server run test src/modules/rmm/repositories/RmmTelemetryRepository.test.ts`.
**Dependencies:** Task 1.1
**Files touched:**
- `server/src/modules/rmm/repositories/RmmTelemetryRepository.test.ts`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Database Foundation
- [x] Atomic upsert replaces two-step query.
- [x] Unit tests pass for single and batch upsert.
- [x] Drizzle migration passes validation.

---

## Phase 2: Redis In-Memory Write-Behind Buffer

### Task 2.1: Implement `TelemetryBufferService` with Micro-Batch Flusher
**Description:** Build `server/src/modules/rmm/services/TelemetryBufferService.ts` using `ioredis`. Implements `bufferPing(data)` writing to Redis Hash `telemetry:latest:<equipmentId>` and tracking dirty keys in Redis Set `telemetry:dirty_devices`. Implements `flushBatch()` to drain dirty keys and invoke `telemetryRepository.upsertTelemetryBatch()`. Runs an unref'd timer every 3,000ms.
**Acceptance criteria:**
- [x] `bufferPing(telemetryData)` stores telemetry in Redis with 24h TTL and adds equipment ID to dirty set.
- [x] `flushBatch(maxItems)` pops dirty equipment IDs, reads latest hashes with Redis pipeline, calls `telemetryRepository.upsertTelemetryBatch()`, and removes processed keys.
- [x] Graceful fallback: If Redis is unavailable, writes directly to `telemetryRepository.upsertTelemetry()`.
- [x] `stop()` clears interval and executes a final synchronous flush of all remaining dirty keys.
**Verification:**
- [x] Unit tests pass.
**Dependencies:** Phase 1
**Files touched:**
- `server/src/modules/rmm/services/TelemetryBufferService.ts`
**Estimated scope:** Medium (1 file)

---

### Task 2.2: Unit Tests for `TelemetryBufferService`
**Description:** Create `server/src/modules/rmm/services/TelemetryBufferService.test.ts` testing buffer insertion, deduplication of multiple pings for the same device, batch flush execution, and Redis failure fallback.
**Acceptance criteria:**
- [x] Test validates rapid successive pings for same device overwrite hash and produce 1 dirty record.
- [x] Test validates flush pipeline executes batch upsert and empties dirty set.
- [x] Test validates Redis connection error executes direct repository fallback.
**Verification:**
- [x] Vitest passes: `npm -w server run test src/modules/rmm/services/TelemetryBufferService.test.ts`.
**Dependencies:** Task 2.1
**Files touched:**
- `server/src/modules/rmm/services/TelemetryBufferService.test.ts`
**Estimated scope:** Small (1 file)

---

### Task 2.3: Wire Telemetry Buffer into Agent Ingest & Shutdown Hooks
**Description:** Integrate `TelemetryBufferService` into `AgentGateway.ts` (when handling agent heartbeats and telemetry messages) and register buffer flush hooks in server graceful shutdown handlers in `server/src/index.ts`.
**Acceptance criteria:**
- [x] Inbound agent telemetry is routed to `telemetryBufferService.bufferPing()`.
- [x] Process `SIGTERM` and `SIGINT` signals invoke `telemetryBufferService.stop()` to drain remaining buffer.
- [x] Clean Architecture: Service is exported through `server/src/modules/rmm/index.ts`.
**Verification:**
- [x] Build succeeds: `npm -w server run build`.
- [x] Backend tests pass: `npm -w server run test`.
**Dependencies:** Task 2.1, Task 2.2
**Files touched:**
- `server/src/modules/rmm/services/AgentGateway.ts`
- `server/src/modules/rmm/index.ts`
- `server/src/index.ts`
**Estimated scope:** Medium (3 files)

---

## Checkpoint: Buffered Ingestion
- [x] Agent pings write to Redis in < 2ms.
- [x] Micro-batch flusher flushes to PostgreSQL every 3s.
- [x] Server shutdown cleanly drains dirty buffer without data loss.
- [x] Vitest test suite passes.

---

## Phase 3: Clustered WebSocket Mesh & Horizontal Scalability

### Task 3.1: Implement `AgentClusterBroker` using Redis Pub/Sub
**Description:** Create `server/src/modules/rmm/services/AgentClusterBroker.ts` to broker WebSocket commands and responses across multiple Node.js worker processes. Listens on `agent:cmd:<equipmentId>` and publishes responses to `agent:res:<correlationId>`.
**Acceptance criteria:**
- [x] Subscribes to Redis channels for cross-worker messaging.
- [x] `publishCommand(equipmentId, command, payload, timeoutMs)` forwards command to the worker holding the active socket.
- [x] `publishResponse(correlationId, result)` returns execution payload to the requesting worker.
- [x] Graceful fallback to local socket map when Redis Pub/Sub is not configured or in single-process mode.
**Verification:**
- [x] Unit tests in `AgentClusterBroker.test.ts` pass (11/11 tests).
**Dependencies:** Phase 2
**Files touched:**
- `server/src/modules/rmm/services/AgentClusterBroker.ts`
- `server/src/modules/rmm/services/AgentClusterBroker.test.ts`
**Estimated scope:** Medium (2 files)

---

### Task 3.2: Integrate Cluster Broker into `AgentGateway`
**Description:** Update `AgentGateway.sendCommand()` to check local sockets first; if not found locally, publish through `AgentClusterBroker`. On inbound command messages from Redis, if the socket is local, dispatch over WebSocket and publish response back.
**Acceptance criteria:**
- [x] `AgentGateway` handles both local and cross-worker agent connections transparently.
- [x] Command timeouts and errors propagate correctly across processes.
**Verification:**
- [x] Existing `AgentGateway.test.ts` and new cluster broker tests pass (37/37 tests).
**Dependencies:** Task 3.1
**Files touched:**
- `server/src/modules/rmm/services/AgentGateway.ts`
- `server/src/modules/rmm/services/AgentGateway.test.ts`
**Estimated scope:** Medium (2 files)

---

### Task 3.3: Add Multi-Worker Cluster Master Runner & Build Config
**Description:** Create `server/src/cluster.ts` using Node.js `node:cluster` to spawn worker processes matching `WEB_CONCURRENCY` or CPU cores, sharing the HTTP/WebSocket port. Update `server/tsup.config.ts` and `server/package.json` with `"start:cluster"`.
**Acceptance criteria:**
- [x] `server/src/cluster.ts` forks workers and handles worker crash recycling.
- [x] `tsup.config.ts` includes `cluster: 'src/cluster.ts'` entrypoint.
- [x] `"start:cluster": "node dist/cluster.js"` added to `server/package.json`.
**Verification:**
- [x] `npm -w server run build` builds both `dist/index.js` and `dist/cluster.js` without errors.
**Dependencies:** Task 3.2
**Files touched:**
- `server/src/cluster.ts`
- `server/tsup.config.ts`
- `server/package.json`
**Estimated scope:** Small (3 files)

---

## Checkpoint: Complete Verification
- [x] Clean compilation: `npm -w server run build`, `npm -w client run build`, `npm run build:packages`.
- [x] 100% test pass: `npm -w server run test` (all 115 test files, 954 tests passing).
- [x] Multi-worker cluster build and configuration verified.
