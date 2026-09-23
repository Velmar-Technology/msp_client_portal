# Implementation Plan: Prevent Rate Limit Re-accumulation (Agent Polling & Gateway Segregation)

## Overview
Eliminate aggressive HTTP ticket polling from the Rust endpoint agent by adding an exponential backoff circuit breaker for un-paired states, segregating machine-agent traffic from human browser IP buckets in `gatewayRateLimiterMiddleware.ts`, and tunneling ticket queries through the persistent WebSocket connection in `AgentGateway.ts`.

## Architecture Decisions
- **Circuit Breaker on Agent IPC**: When `slot_id` is missing/un-paired, or when backend returns 401/404, trip an in-memory circuit breaker (`base: 30s`, `max: 15m`, `jitter: ±20%`) in `ipc_server.rs`, immediately serving cached status to local tray clients.
- **Dedicated Agent Rate Limit Bucket**: Update `gatewayRateLimiterMiddleware.ts` to identify agent requests (`/tickets/agent/*`, `x-agent-instance-id`, or machine auth token) and key them to `ratelimit:agent:<id>` rather than pooling against `ratelimit:gw:<client_ip>`.
- **WebSocket Ticket Streaming**: Introduce `TICKETS_QUERY` and `TICKETS_SNAPSHOT` frames in `AgentGateway.ts` to retrieve ticket summaries over the existing duplex WS tunnel when online.
- **Clean Architecture Compliance**: Changes in `server/` preserve Dependency Inversion (controllers -> services -> repositories). No bypass of `@shared/errors`.

## Task List

### Phase 1: Gateway Rate Limit Segregation
- [ ] Task 1: Update `gatewayRateLimiterMiddleware.ts` to isolate agent traffic into dedicated rate-limit buckets (`ratelimit:agent:*`)
- [ ] Task 2: Add unit tests in `gatewayMiddleware.test.ts` verifying agent vs browser rate-limit keying and isolation

### Checkpoint: Gateway
- [ ] Gateway tests pass: `npm -w server run test src/shared/middleware/gatewayMiddleware.test.ts`
- [ ] Build compiles cleanly: `npm -w server run build`

### Phase 2: Agent IPC Circuit Breaker & Backoff
- [ ] Task 3: Implement exponential backoff and circuit breaker in `packages/msp-agent/src/ipc_server.rs`
- [ ] Task 4: Add local caching for un-paired state to prevent outbound HTTP floods to `/api/v1/tickets/agent/*`

### Checkpoint: Agent
- [ ] Cargo compiles cleanly: `cargo check --manifest-path packages/msp-agent/Cargo.toml`

### Phase 3: WebSocket Ticket Tunnel in AgentGateway
- [ ] Task 5: Add `TICKETS_QUERY` and `TICKETS_SNAPSHOT` message handling in `AgentGateway.ts`
- [ ] Task 6: Add unit tests in `AgentGateway.test.ts` for ticket snapshot query over WS

### Checkpoint: WebSocket Tunnel
- [ ] RMM tests pass: `npm -w server run test src/modules/rmm/services/AgentGateway.test.ts`

### Phase 4: Local Host Re-pairing & Verification
- [ ] Task 7: Bind local `C:\ProgramData\MSP\msp-agent.json` to active tenant slot and verify zero 429 re-accumulation

### Checkpoint: Complete Verification
- [ ] All unit test suites pass
- [ ] Local endpoint reports Online in `msp_list_connected_agents`
- [ ] `ratelimit:gw:<ip>` remains stable

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Tray UI shows stale ticket state | Low | Circuit breaker resets immediately upon user action or pairing event. |
| High memory footprint in Redis from agent keys | Low | Agent keys use shorter sliding window (`5m`) with strict TTL expiration. |
| WS frame size exceeds limits | Low | WS ticket snapshots capped at 30 items with lightweight summary projection. |

## Open Questions
- None. Requirements and scope were aligned during `/idea-refine`.
