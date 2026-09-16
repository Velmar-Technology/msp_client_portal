# Idea Refine: High-Throughput Telemetry & Scalable Backend Blueprint (5,000 Endpoints)

## Problem Statement
**How might we** scale our PERN-stack modular monolith to ingest high-frequency endpoint telemetry and maintain 5,000 persistent agent WebSockets (~300 pings/s) without overloading PostgreSQL, exhausting database connections, or rewriting our backend in another language?

---

## Recommended Direction: The "Hybrid Redis Buffer & Clustered Gateway" Pattern

Rather than a risky language or framework rewrite (Node.js 22 handles 10k+ req/s easily when I/O is non-blocking), evolve the architecture using our existing Redis and PostgreSQL infrastructure in three phased moves:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                   SCALABLE TELEMETRY INGESTION PIPELINE                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ 5,000 Agents (msp-agent / msp-tray)                                          │
│      │                                                                       │
│      ▼                                                                       │
│ [ Node.js Ingest Gateway ] ──► (In-Memory Buffer / < 2ms latency)           │
│      │                                                                       │
│      ▼                                                                       │
│ [ Redis HSET Buffer: `telemetry:latest:<slot_id>` ]                          │
│      │                                                                       │
│      ▼ (Every 3 seconds: Bulk Flush)                                         │
│ [ BullMQ / Interval Worker: Bulk Postgres Upsert ]                           │
│      │                                                                       │
│      ▼ (1 Single Query for 500 updates: INSERT ON CONFLICT DO UPDATE)        │
│ [ PostgreSQL: `rmm_device_telemetry` ]                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

1. **Native Atomic Upsert (`INSERT ... ON CONFLICT DO UPDATE`):**
   Refactor `RmmTelemetryRepository.upsertTelemetry` to eliminate the preliminary `SELECT`. A single atomic query cuts database roundtrips in half immediately.
2. **Redis In-Memory Write-Behind Buffer:**
   Telemetry heartbeats write directly to Redis key `telemetry:device:<id>` in < 2ms. A periodic flush worker drains the dirty keys and executes a single bulk SQL upsert every 3–5 seconds. This transforms 300 random writes/sec into **1 batched query every 3 seconds** (a 99% reduction in DB write operations).
3. **Redis Pub/Sub WebSocket Mesh:**
   Introduce a lightweight Redis Pub/Sub adapter to `AgentGateway.ts`. Outbound commands (`sendCommand()`) and broadcasts publish to Redis channel `agent:commands:<slotId>`, allowing any clustered Node.js worker to control any connected workstation seamlessly.

---

## Key Assumptions to Validate
- [ ] **Data Freshness:** Confirm that a 3-second write-behind flush interval provides completely acceptable freshness for technician dashboards and RMM health monitors.
- [ ] **Bulk Upsert Performance:** Benchmark Drizzle executing `insert(rmmDeviceTelemetry).values([...bulk]).onConflictDoUpdate(...)` for 500 rows; target execution time: `< 25ms`.
- [ ] **Socket Memory Footprint:** Verify memory consumption for 5,000 connected `ws` instances in Node 22 (expected: ~150–250MB RAM total, well within standard VPS limits).

---

## MVP Scope

### Phase 1 (Immediate Quick Wins - Day 1):
- Refactor `RmmTelemetryRepository.upsertTelemetry` to use Drizzle's `.onConflictDoUpdate()`.
- Add index on `rmm_device_telemetry(last_sync_at, agent_status)` to optimize stale-device sweeps.
- Enable Node.js cluster mode in production or run 2-4 worker containers behind Portainer.

### Phase 2 (Telemetry Write-Behind & Socket Relay - Week 1):
- Implement `TelemetryBufferService` in `server/src/modules/rmm/services/` utilizing existing `ioredis`.
- Buffer agent pings in Redis and trigger batched database writes via `setInterval` or a lightweight BullMQ queue.
- Add Redis Pub/Sub to `AgentGateway` so command correlation works across multiple server instances.

### What's Out (Not Doing & Why):
- **NOT rewriting in Go, Rust, or Elixir:** Massive development friction and loss of end-to-end TypeScript types with `@shared/contracts` for zero business benefit at 5,000 endpoints.
- **NOT introducing Kafka or RabbitMQ:** Redis Streams and BullMQ solve this scale effortlessly using the Redis instance we already deploy.
- **NOT migrating to microservices:** Retain the Modular Monolith; separate compute threads via Node clustering or workers rather than splitting repositories.

---

## Open Questions
1. Does the 3-second batching buffer satisfy all immediate alert and telemetry threshold triggers (BL-103 alert noise reduction)?
2. Would you like to proceed with drafting the Phase 1 quick-win (`onConflictDoUpdate` atomic upsert) right away?
