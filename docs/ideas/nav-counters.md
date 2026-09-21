# Nav Counters — "Unread since last visit" across the sidebar

## Problem Statement
How might we surface a per-destination "there's something new for you" signal on each sidebar item, so users notice new/actionable items without a wall of permanent badges?

## Recommended Direction
Build a backend `nav` read-model module that owns the concept of "new since you last looked." A new `user_nav_views` table stores `last_seen_at` per `(user, nav_key)`, so the signal is cross-device and survives logout. One endpoint `GET /api/v1/nav/counters` returns `{ [navKey]: { count, latestAt } }` computed as "items newer than the caller's seen marker," scoped by role + tenant exactly like `TicketQueryService.getStatusSummary`. `POST /api/v1/nav/seen` upserts the marker when a destination is opened.

The sidebar stays data-driven: `NavItem` gains an optional `counterKey`, set per role in `useSidebar.ts`. `SidebarNavList` renders a compact numeric pill that hides under icon collapse and shows `99+` beyond the cap. Live freshness reuses the existing SSE connection — the server emits a `nav:invalidate` event, the client invalidates the counters query. This makes the sidebar and the notification bell agree on a single truth instead of drifting apart.

## Key Assumptions to Validated
- [ ] Users want destination counters beyond the bell — test with 3 clients / 2 techs before full build
- [ ] `updated_at > last_seen_at` reads as "new" to users — instrument dismiss/click-through
- [ ] Mark-seen-on-route-visit is acceptable — watch for badges zeroing without engagement
- [ ] Own-action noise is tolerable — counted a client's own reply as a real edge case
- [ ] RLS policy on the new table doesn't block upserts — integration test with tenant context

## Recommended Direction (decision defaults)
- **Own-action suppression:** Deferred to Phase D. Client's own reply may count as "new" in v1.
- **Role matrix:**
  - CLIENT: tickets, devices, resources, password-manager, billing, maintenance
  - TECHNICIAN: tickets, maintenance
  - ADMIN: crm, tickets, billing, devices, maintenance

## MVP Scope (full system, phased)

### Phase A — Foundation (server)
- Migration `047_create_user_nav_views.sql` (+ RLS policy mirroring 029/039) and schema table
- `server/src/modules/nav/` — `NavCounterRepository`, `NavCounterService`, `NavCounterController`, `nav.routes.ts`, `index.ts`
- Contracts: `packages/contracts/src/nav/nav.contract.ts`
- Register `gatewayClusterRouter.use('/nav', navroutes)`

### Phase B — Signals (server)
- Role-aware sources: tickets, invoices, devices, maintenance, CRM leads, notifications mirror
- `notificationService.broadcastNavInvalidate(userId, navKey)` on domain mutations

### Phase C — UI (client)
- `client/src/features/nav/` slice: `api/navCounterService.ts`, `api/useNavCounterQueries.ts`, `components/NavCounterBadge.tsx`, `index.ts`
- `NavItem.counterKey` in `useSidebar.ts`; wire counters into `SidebarNavList`
- Mark-seen on route activation (once per mount, debounced)
- SSE listener for `nav:invalidate` → `queryClient.invalidateQueries`
- i18n keys in `en_US.json` + `es_DO.json`

## Not Doing (and Why)
- Single aggregate "attention" indicator — rejected; per-destination context chosen
- LocalStorage seen-state — rejected; DB-backed cross-device truth chosen
- Per-user mute toggles — deferred to Phase 2
- WebSocket second channel — reuse existing SSE
- Real-time per-event delta animation — aspirational; needs read-model first

## Open Questions
- Should the bell's unread count drive the `notifications` nav key, or stay separate?
- Cache TTL vs. pure SSE invalidation — is Redis caching worth it at current tenant scale?
