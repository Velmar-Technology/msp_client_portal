# ADR-013: Cross-Device Sidebar Nav Counters with DB-Persisted Seen Markers

## Status
Accepted

## Date
2026-09-21

## Context

Users navigate the sidebar to access tickets, devices, maintenance, billing, and CRM. There is currently no visibility into which nav destinations have new or updated items since the user last visited. Users must manually visit each section to check for changes, which creates friction and delays response to time-sensitive items (e.g. new tickets, overdue invoices, device alerts).

Requirements:
- Show per-nav-item "unread since last visit" badges on the sidebar
- Counters must be **cross-device** (same seen state on desktop, tablet, mobile)
- Badges should update **live** when new items arrive (via existing SSE infrastructure)
- Role-based: CLIENT sees tickets/devices/billing/maintenance; TECHNICIAN sees tickets/maintenance; ADMIN sees crm/tickets/billing/devices/maintenance
- Minimal latency; no additional polling

---

## Decision

Implement a full-stack nav counters system with **DB-persisted seen markers**, a dedicated server module, and SSE-driven live badge refresh on the client.

### 1. DB-Persisted Seen Markers (Cross-Device)

A `user_nav_views` table stores `(user_id, nav_key, last_seen_at, tenant_id)` with a unique constraint per user+nav_key. Each row tracks when a user last visited that nav destination. On route mount, the client upserts the seen timestamp. Counters are computed as `COUNT(*) WHERE updated_at > last_seen_at` per source table.

**Why DB over localStorage:** localStorage is device-scoped. A technician checking tickets on their phone won't see the same badge state on their desktop. DB gives a single source of truth.

### 2. Server Module: `server/src/modules/nav/`

A dedicated Clean Architecture module (`NavCounterService`, `NavCounterController`, routes) handles two endpoints:
- `GET /api/v1/nav/counters` — returns `{ [navKey]: { count, latestAt } }` for the user's role
- `POST /api/v1/nav/seen` — upserts `last_seen_at` for a given nav key

The service iterates over the user's role-based nav keys and queries each source table (`tickets`, `invoices`, `rmmAlerts`, `deviceMaintenances`, `leads`, `notifications`) with a `WHERE updated_at > last_seen_at` filter. A sequential loop (not parallel) is acceptable given the small number of sources (max 6) and the low query complexity (single index scan each).

### 3. SSE-Driven Live Updates

Rather than polling, the system leverages the existing SSE notification stream. When a mutation occurs that should refresh counters (e.g. ticket created, invoice generated), domain services call `notificationService.broadcastNavInvalidate(userId, navKey)`. The client listens for `nav:invalidate` SSE events and invalidates the TanStack Query cache for `navCounters`, triggering an automatic refetch.

**Why SSE over polling:** The portal already maintains a persistent SSE connection for notifications. Piggybacking nav invalidation onto this channel avoids introducing a second connection or polling interval.

### 4. Client Feature Slice: `client/src/features/nav/`

Follows ADR-002 colocated feature architecture:
- `api/navCounterService.ts` — Axios API calls
- `api/useNavCounterQueries.ts` — TanStack Query hooks (`useNavCounters`, `useMarkNavSeen`)
- `components/NavCounterBadge.tsx` — Compact numeric pill (`99+` cap), hidden when count is 0
- `hooks/useNavCounterStream.ts` — Bridges SSE `navInvalidationAt` from Zustand store to TanStack Query invalidation
- `routes.tsx` + `index.ts` — Required by ADR-002/ADR-003 architecture invariants

### 5. Route-Mount Mark-Seen

On sidebar mount, `useEffect` fires once (guarded by `hasMarkedRef`) and calls `markSeenMutation.mutate(navKey)` for the matched route. This ensures the seen marker is updated exactly once per page visit, avoiding spam updates from re-renders.

---

## Alternatives Considered

### localStorage (Client-Only Seen Markers)
- Pros: Zero server changes, instant writes
- Cons: Device-scoped — counters diverge across browsers/devices. Lost on cache clear. Incompatible with multi-device technicians.
- **Rejected:** Violates cross-device requirement.

### Redis Cached Counters
- Pros: Fast reads, existing Redis infrastructure
- Cons: Cache invalidation complexity; stale counts possible; still needs DB for persistence across restarts
- **Rejected:** Adds a caching layer for a low-frequency read (once on sidebar mount). DB index scans on `updated_at` are sufficient at current scale.

### Polling (setInterval refetch)
- Pros: Simple implementation
- Cons: Wastes bandwidth when nothing changes; introduces configurable interval complexity; delayed badge updates
- **Rejected:** SSE invalidation is already available and gives near-instant updates.

### Own-Action Suppression (skip marking seen for user's own mutations)
- Pros: Avoids counting the user's own creates/updates as "new"
- Cons: Adds complexity to every mutation site; requires distinguishing "self" vs "other" updates; edge cases with shared tickets
- **Deferred:** Accepted as v1 noise. The badge shows "items updated since you last looked" regardless of who updated them. Can be refined in a future iteration.

---

## Consequences

### Positive
- Cross-device consistency: seen state is authoritative regardless of access point
- Near-instant badge updates via existing SSE channel (no new connections)
- Clean architecture: dedicated `nav` module with no cross-boundary violations
- Role-based counter matrix enforced server-side
- Zero additional client polling or WebSocket connections

### Negative / Trade-offs
- One additional DB table (`user_nav_views`) with per-user rows
- Sequential source queries in `getCounters` (6 queries per request); acceptable at current scale but may need `Promise.all` if source count grows
- Own-action suppression deferred — badges may show the user's own recent mutations as "new"

---

## Verification

- `npm -w server run build` — zero TypeScript errors
- `npm -w client run build` — zero TypeScript errors
- `npm -w server run test` — 116 files, 960 tests pass
- `npm -w client run test:run` — 51 files, 355 tests pass (including ADR-002/ADR-003 arch invariant tests)
- Runtime: `GET /api/v1/nav/counters` returns per-key counts; `POST /api/v1/nav/seen` upserts seen marker
- SSE: creating a ticket triggers `nav:invalidate` event, client badge updates without refresh
