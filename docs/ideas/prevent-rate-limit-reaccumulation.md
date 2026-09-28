# Idea: Prevent Rate Limit Re-accumulation

## Problem Statement
How might we eliminate HTTP polling from endpoint desktop agents by moving ticket synchronization to the persistent WebSocket tunnel, ensuring un-paired or misconfigured agents never exhaust the shared gateway rate limit?

## Recommended Direction: Push-First WebSocket Ticket Sync & Gateway Rate-Limit Segregation

The current issue stems from a structural mismatch between transport protocols:
1. **The Culprit:** The Rust agent (`packages/msp-agent/src/ipc_server.rs`) already maintains a persistent, duplex WebSocket connection to the central server (`/agent-ws`), but whenever the desktop tray app requests ticket data, the agent spawns separate HTTP GET requests to `/api/v1/tickets/agent/active` and `/api/v1/tickets/agent/list`.
2. **The Bottleneck:** Because `/tickets/agent` is a machine-authenticated route, it bypasses tenant extraction (`gatewayTenantContextMiddleware.ts`) and defaults the rate limiter identifier strictly to the client's public IP (`req.ip = 186.6.42.61`). When an agent's slot is un-paired, polling retries in a tight loop, saturating the IP's 1,000-request window and blocking the operator's human browser session.

### The 3-Pillar Solution:
* **Pillar 1 (Protocol Shift):** Tunnel ticket state queries and live updates through the existing `AgentGateway` WebSocket connection (`TICKETS_QUERY` / `TICKETS_SNAPSHOT`). Zero HTTP polling required while the WS connection is active.
* **Pillar 2 (Client Circuit-Breaker & Exponential Backoff):** If the agent falls back to HTTP or receives a `401 Unauthorized` / `404 Not Found` (unbound slot), trip an exponential backoff circuit breaker (`base: 30s`, `max: 15m`, `jitter: ±20%`) rather than spamming every few seconds.
* **Pillar 3 (Gateway Sub-Quota & Agent Keying):** In `gatewayRateLimiterMiddleware.ts`, detect machine tokens/headers and partition agent traffic to `ratelimit:agent:<slot_or_guid>` with dedicated limits, preventing agent traffic from polluting human browser IP buckets (`ratelimit:gw:<ip>`).

## Key Assumptions to Validate
- [ ] Ticket summaries (`limit=30`) are sufficiently lightweight (< 32 KB) to stream cleanly over existing JSON WebSocket frames in `AgentGateway`.
- [ ] When machine-authenticated HTTP requests do occur, the agent presents identifiable headers that allow sub-quota keying even prior to tenant resolution.
- [ ] The desktop tray UI maintains responsiveness via local named-pipe IPC caching.

## MVP Scope

### In Scope:
1. **Agent IPC Circuit Breaker (`packages/msp-agent/src/ipc_server.rs`):** Exponential backoff on HTTP 401/404/5xx; halt polling when un-paired.
2. **Gateway Bucket Segregation (`server/src/shared/middleware/gatewayRateLimiterMiddleware.ts`):** Partition `/api/v1/tickets/agent/*` and machine traffic away from `ratelimit:gw:<ip>`.
3. **WebSocket Ticket Tunnel (`server/src/modules/rmm/services/AgentGateway.ts`):** `TICKETS_QUERY` and `TICKETS_SNAPSHOT` frames over the persistent WS socket.
4. **Local Slot Re-pairing:** Re-binding the local PC to an active tenant slot to restore clean telemetry.

### Not Doing (and Why):
- IP whitelisting (violates multi-tenant security principles).
- Raising global gateway rate limits beyond 1,000 req/15m (degrades DDoS defense).
- Rewriting the desktop tray UI protocol (keeps existing named pipe IPC).
