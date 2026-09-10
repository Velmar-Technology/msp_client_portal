# ADR-008: Real-Time Bidirectional Ticket Chat Multiplexing, Room-Based Streaming & Non-Inverting Identity Synchronization

## Status
Accepted

## Date
2026-09-10

## Context
In ADR-005, we established the initial endpoint ticketing model and a unidirectional push relay from the web portal to the physical workstation tray companion (`TicketDetailPage` $\rightarrow$ `AgentGateway` $\rightarrow$ `msp-agent` $\rightarrow$ `msp-tray`). However, real-world deployment revealed three critical architectural bottlenecks and identity discrepancies:

1. **Unidirectional Real-Time Gap:**
   When a desk worker replied from the desktop tray assistant, the reply was persisted in the database via `POST /api/v1/tickets/:id/responses/agent`, but support technicians actively viewing `TicketDetailPage.tsx` in the web portal were not notified. Technicians had to manually reload the entire browser page or wait for external notification triggers to observe incoming worker messages.
2. **Database Persistence & Projection Omission:**
   While the schema contained `ticket_responses.author_name`, `TicketResponseRepository.create` omitted `author_name` from its insert statements, and `findByTicket` omitted `author_name` from its column projections. As a result, workstation responses were stored with `author_name: null`.
3. **Role Inversion & Identity Swapping:**
   Because `author_name` was null, queries joined `ticket_responses.user_id` against the `users` table. The machine token bound workstation operations to the tenant's provisioning user account (`clientId`), which often had an `ADMIN` or `TECHNICIAN` role:
   - In `LiveChatDrawer.tsx`, the workstation's own message evaluated as `authorRole === 'TECHNICIAN'`, causing the desk user's outgoing message to render on the **LEFT** with a support headphone icon instead of on the **RIGHT** as "You".
   - In `TicketResponses.tsx`, `isSelf = resp.user_id === user?.id && !resp.author_name`. Because `author_name` was null, portal technicians saw desk worker replies in the technician's outgoing primary bubble on the **RIGHT**.
4. **WebSocket Upgrade Conflicts:**
   Multiple independent `WebSocketServer` instances initialized on the same HTTP server caused port collisions and upgrade handler conflicts in Node.js when attempting path-based routing.

---

## Decision

We adopt a **Unified Bidirectional Real-Time Chat Streaming Architecture** pairing server-level HTTP upgrade multiplexing with room-based pub/sub streaming and unambiguous conversational identity semantics:

### 1. HTTP Upgrade Multiplexing (`server/src/index.ts`)
We initialize both `AgentGateway` and `TicketStreamGateway` using `WebSocketServer({ noServer: true })`. A single top-level HTTP `server.on('upgrade', ...)` handler inspects the incoming request URL path:
- `/agent-ws` $\rightarrow$ Handled by `agentGateway` (machine token / hardware session 0 agent).
- `/portal-ws` $\rightarrow$ Handled by `ticketStreamGateway` (user JWT / browser web portal session).
- Unknown paths are immediately terminated with `socket.destroy()`.

### 2. Room-Based Web Portal Gateway (`TicketStreamGateway`)
* Mounted at `/portal-ws`. Authenticates web clients via JWT query parameter or `Authorization: Bearer <token>`.
* **Zero Standing Privilege & Tenant Boundary:** When a client joins a ticket room (`ticket:<id>`), the gateway queries `ticketRepository.findById(ticketId)` and enforces `ticketAccessPolicy.assertReadAccess(ticket, userCtx)`. Cross-tenant room subscriptions are rejected with `4003 Forbidden`.
* Maintains in-memory indexes `ticketRooms` (`Map<string, Set<WebSocket>>`) and `socketToTickets` (`Map<WebSocket, Set<string>>`). Sockets that disconnect or error are cleanly pruned, and empty rooms are removed to prevent memory leaks.
* Implements a 20-second ping/pong heartbeat to maintain connectivity through corporate NATs and reverse proxies.

### 3. Bidirectional Fan-Out in `TicketResponseService`
Whenever a conversational message is created:
* **From Portal (`addTicketResponse`):** Broadcasts payload to `/portal-ws` subscribers in room `ticket:<id>` and pushes to `/agent-ws` if the ticket is bound to an active RMM endpoint. Payload explicitly sets `isAgentAuthored: false`.
* **From Workstation Tray (`addTicketResponseFromAgent`):** Broadcasts payload to `/portal-ws` subscribers in room `ticket:<id>` with `isAgentAuthored: true`, `authorRole: 'CLIENT'`, and `authorName: data.reporterName`.

### 4. Non-Inverting Visual Attribution Semantics
We establish strict visual alignment invariants across both interfaces:

| Perspective | Message Origin | Author Role | Alignment | Avatar / Icon | Visual Bubble |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Web Portal** (`TicketResponses.tsx`) | Physical Workstation | `CLIENT` (`isAgentAuthored: true`) | **LEFT** | Worker initials | Muted with `[Endpoint]` badge |
| **Web Portal** (`TicketResponses.tsx`) | Current Logged-in Staff | `TECHNICIAN` / `ADMIN` (`isSelf: true`) | **RIGHT** | User initials | Primary brand blue bubble |
| **Desktop Tray** (`LiveChatDrawer.tsx`) | Physical Workstation | `CLIENT` | **RIGHT** | `UserCheck` (Amber) | Amber border, labeled `"You"` |
| **Desktop Tray** (`LiveChatDrawer.tsx`) | Remote Support Staff | `TECHNICIAN` / `ADMIN` | **LEFT** | `Headphones` (Blue) | Deep navy blue `#0084ff` bubble |

### 5. Client Real-Time Hook & Resilient Fallback (`useTicketChatStream.ts`)
* `useTicketChatStream` manages the WebSocket connection lifecycle in `TicketDetailPage.tsx` with exponential backoff auto-reconnect (up to 15s).
* Incoming push frames dynamically append to the active message thread without triggering full page re-renders.
* **Concurrent Push Deduplication:** `useTicketDetail.ts` verifies `prev.some((r) => r.id === newResponse.id)` to avoid duplicates when both HTTP responses and WebSocket pushes resolve simultaneously.
* **Adaptive Polling Fallback:** If the WebSocket connection is interrupted, an 8-second polling fallback in `useTicketDetail.ts` and a 3-second fallback in `LiveChatDrawer.tsx` reconcile thread history. Polling automatically pauses when tickets enter terminal states (`RESOLVED`, `CLOSED`, `CANCELLED`).

---

## Consequences

### Positive
- **Instant Two-Way Communication:** Messages appear in both the web portal and desktop tray assistant in $< 100\text{ms}$.
- **Accurate Human Attribution:** Workstation worker names (`author_name`) are permanently recorded in audit trails and displayed in the portal UI, eliminating anonymous machine reports.
- **Strict Multi-Tenant Isolation:** WebSocket connections are authenticated via JWT and authorized against domain policies before room entry, preventing cross-tenant surveillance.
- **Zero Race-Condition Clutter:** Optimistic UI state setters and background reconcilers deduplicate messages by UUID.

### Negative / Trade-Offs
- **Gateway Memory Tracking:** Requires maintaining active WebSocket room sets in server memory. (Mitigated by automatic room cleanup on disconnect).
- **Dual WebSocket Endpoints:** Separate endpoints (`/agent-ws` and `/portal-ws`) require proxy rules in `vite.config.ts` and production Nginx/ingress configurations.
