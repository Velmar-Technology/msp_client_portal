# Implementation Plan: High-Throughput Telemetry & Scalable Backend Blueprint (5,000 Endpoints)

## Overview
Scale the PERN-stack modular monolith to comfortably ingest high-frequency endpoint telemetry and maintain 5,000 persistent agent WebSockets (~300 pings/s) without overloading PostgreSQL, exhausting database connection limits, or rewriting the backend. This plan delivers atomic SQL upserts, an in-memory Redis write-behind buffer, and a Redis Pub/Sub clustered WebSocket mesh that enables multi-core horizontal worker scaling.

## Architecture Decisions
- **Single Atomic SQL Upsert (`onConflictDoUpdate`):**
  Eliminate the two-step `SELECT + UPDATE/INSERT` in `RmmTelemetryRepository.ts`. A single atomic PostgreSQL `INSERT ... ON CONFLICT (equipment_id) DO UPDATE SET ...` cuts DB roundtrips in half and prevents race conditions under concurrent pings.
- **Write-Behind Micro-Batching with Redis (`TelemetryBufferService`):**
  Incoming telemetry heartbeats write to an in-memory Redis Hash `telemetry:latest:<equipmentId>` (< 2ms) and mark the device dirty. A background interval worker flushes dirty snapshots to PostgreSQL in bulk micro-batches every 3 seconds via `INSERT ON CONFLICT DO UPDATE`. This cuts continuous database write operations by ~95%.
- **Clustered WebSocket Command Mesh (`AgentClusterBroker`):**
  Decouple `AgentGateway`'s in-memory socket map from single-process memory. Using Redis Pub/Sub channels (`agent:cmd:<equipmentId>` and `agent:res:<correlationId>`), any Node.js worker in a cluster can dispatch commands and receive correlated responses from an agent connected to any other worker.
- **Performance Indexes:**
  Add a compound index on `rmm_device_telemetry(agent_status, last_sync_at)` to eliminate sequential table scans during stale-agent sweeps and health evaluations.
- **Node.js Multi-Core Clustering:**
  Add a native `cluster.ts` master runner utilizing Node.js `node:cluster` to utilize all CPU cores in production containers, binding workers to the same port.

## Task List

### Phase 1: Database Layer Fortification & Atomic Upserts (Quick Win)
- [ ] Task 1.1: Implement atomic `.onConflictDoUpdate()` and batch upsert in `RmmTelemetryRepository.ts`.
- [ ] Task 1.2: Add compound index `idx_rmm_telemetry_status_sync` on `rmm_device_telemetry` and generate migration.
- [ ] Task 1.3: Add unit tests for atomic upsert and batch upsert mechanics in `RmmTelemetryRepository.test.ts`.

### Checkpoint: Database Foundation
- [ ] Atomic upsert replaces two-step query.
- [ ] Unit tests pass for single and batch upsert.
- [ ] Drizzle migration passes validation.

### Phase 2: Redis In-Memory Write-Behind Buffer
- [ ] Task 2.1: Implement `TelemetryBufferService` with dirty-key tracking, Redis Hash storage, and micro-batch flusher.
- [ ] Task 2.2: Unit tests for `TelemetryBufferService` buffering, deduplication, and flush cycles.
- [ ] Task 2.3: Wire `TelemetryBufferService` into agent telemetry ingest paths and register graceful shutdown flush hooks in `server/src/index.ts`.

### Checkpoint: Buffered Ingestion
- [ ] Agent pings write to Redis in < 2ms.
- [ ] Micro-batch flusher flushes to PostgreSQL every 3s.
- [ ] Server shutdown cleanly drains dirty buffer without data loss.
- [ ] Vitest test suite passes.

### Phase 3: Clustered WebSocket Mesh & Horizontal Scalability
- [ ] Task 3.1: Implement `AgentClusterBroker` using Redis Pub/Sub for cross-worker command/response routing.
- [ ] Task 3.2: Integrate `AgentClusterBroker` into `AgentGateway.ts` with local in-memory fallback for development.
- [ ] Task 3.3: Unit tests for cross-worker command dispatch and response correlation.
- [ ] Task 3.4: Add multi-worker cluster runner `server/src/cluster.ts` and update `tsup.config.ts`.

### Checkpoint: Complete Verification
- [ ] Clean build across workspaces (`npm -w server run build`, `npm -w client run build`, `npm run build:packages`).
- [ ] 100% backend test suite pass (`npm -w server run test`).
- [ ] Multi-worker cluster smoke test passes without port collisions.

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Redis instance failure during flush interval | High | Telemetry pings fall back to direct atomic SQL upsert if Redis is unreachable; telemetry is transient and refreshed on next ping. |
| Memory bloat from un-flushed dirty keys | Medium | Buffer drains on interval and limits batch size to 500 items per chunk; dirty set uses primitive UUID strings. |
| Stale data race between buffer and direct read | Low | Technician dashboard reads from Postgres or checks Redis latest hash; 3s lag is well within SLA for 30s-60s agent pings. |
| Redis Pub/Sub message loss | Low | Outbound commands have 15s timeout with explicit rejection if no worker responds. |

## Open Questions
- None. (Scope bounded to 5,000 endpoints using existing Redis and PostgreSQL infrastructure).
