# ADR-006: Frontend Runtime Performance Campaign and Grafana Faro Sole-Telemetry

## Status
Accepted

## Date
2026-09-09

## Context
During a Winter 2026 performance campaign (Tier-1 fixes), a WebPageTest/HAR analysis of the production client
(`https://helpdesk.velmartech.com.do`, CSP6 + Traefik edge) revealed the entire application was being shipped on the
first-paint critical path:

1. **Barrels defeated code-splitting.** Every feature `client/src/features/<domain>/index.ts` re-exported its pages
   and UI components (`export * from './pages/...'`, `export * from './components/...'`). `appRouter.tsx` statically
   imports all 12 gateways to collect route manifests, so every page compiled into the entry chunk. `rollup` reported
   `INEFFECTIVE_DYNAMIC_IMPORT` for both the gateways (imported statically by `appRouter` and dynamically by the route
   preloaders) and the pages themselves (imported statically by the barrel and dynamically by `routes.tsx`). Page code
   was duplicated between the entry chunk and per-page chunks; `dist/index.html` emitted 26 `modulepreload` links and
   the initial JavaScript+CSS payload was ≈ 2,461 KB raw / 662 KB gzip.
2. **Observability SDK was eager.** The Datadog RUM SDK (`@datadog/browser-rum`, ≈ 168-173 KB) was statically imported
   by `services/api.ts` and baked into the eager `api.js` chunk. Faro was already wired locally but never present in
   production (the collector exists behind Traefik at `https://helpdesk.velmartech.com.do/collect`; `VITE_FARO_URL` was
   never passed as a Docker build arg).
3. **Render-blocking third-party fonts.** `src/index.css` started with a Google Fonts `@import` (Inter + JetBrains
   Mono) while the app already self-hosts Inter and Geist via `@fontsource`.
4. **Oversized graphics.** `src/assets/logo.png` was 864×670 (226.8 KB) and `public/favicon.svg` embedded a
   864×670 base64 PNG (303 KB).
5. **No static compression.** `client/nginx.conf` used only dynamic `gzip` (no `gzip_static`).

We require the biggest possible reduction in first-load bytes and render-blocking work from low-risk, Tier-1 changes
while preserving the ADR-002 public-gateway contract (deep imports into feature internals are prohibited by lint and by
`client/tests/arch/feature-architecture.test.ts`).

---

## Decision

### 1. Slim Feature Gateways (code-splitting by construction)
Each feature `index.ts` now re-exports only **routes, services, queryOptions, hooks, and types** — never pages or
page-only UI components. Pages are reachable exclusively through the `lazy`/`lazyWithRetry` dynamic `import()` in each
feature's `routes.tsx`, so they ship as independent chunks fetched on navigation. A statically-imported gateway is now
deliberately lean, so "importing the gateway" no longer drags the feature's pages onto the critical path. All app-level
code continues to import through `@/features/<domain>` (ADR-002 lint unchanged).

### 2. Lazy Public Components (gateway + laziness, without Suspense leaks)
When a component must remain part of a feature's public surface but is only consumed on demand (e.g.
`ScheduleMaintenanceModal`, referenced by the RMM/lazy devices page), the gateway re-exports a **lazy wrapper** that owns
its own `<Suspense fallback={null}>` boundary instead of re-exporting the eager module:
`client/src/features/rmm/components/ScheduleMaintenanceModal.lazy.tsx` → exported from `@/features/rmm`.
This keeps ADR-002 compliance and keeps the 9 KB modal chunk lazy.

### 3. Grafana Faro Is the Sole RUM; Datadog Removed
* `@datadog/browser-rum`, `telemetry/datadog.ts`, its tests, and the five `VITE_DD_*` Docker build args were removed.
* Faro initialization is **deferred** in `client/src/main.tsx`: `import('@/telemetry/faro').then((m) => m.initFaro())`
  scheduled via `requestIdleCallback({ timeout: 3000 })` (3 s `setTimeout` fallback), so the SDK never blocks first paint.
* `vite.config.ts` groups Faro/OTel into a lazy `vendor-rum` `manualChunks` bucket (declared **before** the `vendor-react`
  check because `@grafana/faro-react` contains the substring `react`).
* If `VITE_FARO_URL` is unset, Faro logs a "stand-by" notice and does nothing — telemetry failure is never fatal.
* Devops: `.github/workflows/deploy.yml` passes `VITE_FARO_URL=${{ secrets.VITE_FARO_URL }}` (plus
  `VITE_FARO_APP_NAME`/`VITE_FARO_APP_ENV` with defaults) as Docker build args. Datadog remains **server-side APM only**
  (`server/src/tracer.ts`, `DD_*` env in `docker-compose.prod.yml`).

### 4. Self-Hosted Fonts
The Google Fonts `@import` was removed from `src/index.css`; JetBrains Mono is now self-hosted via
`@fontsource-variable/jetbrains-mono` and `--font-mono` points at `'JetBrains Mono Variable'`. No render-blocking
external stylesheet.

### 5. Asset Optimization
`logo.png` resized 864×670 → 512 px wide (226.8 → 82.3 KB). `favicon.svg` rebuilt embedding a 128 px PNG (303 → 17.6 KB).

### 6. Delivery & Service Worker
* `client/nginx.conf`: added `gzip_static on;` (serves pre-compressed assets; Brotli is provided by Traefik's
  compression middleware at the edge rather than the nginx image).
* `client/public/sw.js`: `PRECACHE_ASSETS` lists only `/index.html` (deduplicating `/` and `/index.html`); navigation
  requests remain network-first so content updates beat the cache.

### 7. Dead-Route Shim Purging
Removed legacy compatibility shims that pinned the eager graph to feature internals: `components/tickets/*`,
`components/new-ticket-modal.tsx`, `components/devices/index.ts`, and the unreferenced `routes/_app/*` + `routes/_auth/*`
page forwarders (kept `_app/resources`, `_app/help`, `_public/*` which forward to `@/pages`, not feature internals).

### 8. Preloader Hygiene
`lib/preloadRoute.ts` no longer lists per-route `import("@/features/...")` chunk preloaders — gateway modules are
already statically bundled, so those dynamic imports were ineffective and produced build warnings. Intent-based
**query-cache** prefetch (`routeQueryPreloaders`) is retained; `routePreloaders` now aliases the query map, so sidebar
hover/focus still warms data on idle. `chunkSizeWarningLimit` raised 600 → 700 KB (the 630 KB `vendor-react` chunk).

---

## Consequences

### Measured (initial page load, production build):
| Metric | Before | After |
|---|---|---|
| Initial JS+CSS raw | 2,461 KB | ≈ 1,680 KB |
| Initial JS+CSS gzip | 662 KB | ≈ 478 KB |
| `index.html` modulepreloads | 26 | 22 |
| Eager shell chunks | `index` 372 KB + `useAuthStore` 383 KB | `index` 287 KB + `useAuthStore` 94 KB |
| Datadog RUM SDK (168-173 KB) | eagerly bundled | removed |
| Faro SDK | not shipped | lazy `vendor-rum` chunk, init on idle |
| Page chunks | duplicated in entry | single lazy chunks (e.g. CRM 77 KB, Devices 88 KB) |

### Positive
* First load drops ≈ 35% raw / ≈ 28% gzip; pages now load only when navigated to.
* One observability path (Faro) with graceful degradation; no third-party render-blocking requests; static pre-compressed
  assets served by Nginx.

### Negative / Trade-offs
* Pages no longer arrive via hover prefetch of their route chunk; navigation fetches the page chunk on demand (route
  `lazy`). Query data is still prefetched on intent.
* Feature gateways must stay lean by discipline; lint and the arch test do not (yet) forbid `export * from './pages'`.

---

## Architectural Invariant Rules
1. **Gateway Leanness:** No feature `index.ts` may `export *` (or named-export) a page or page-only component. Keep
   routes, services, queryOptions, hooks, and types.
2. **ADR-002 Stands:** Cross-feature imports continue through `@/features/<domain>` only; no `@/features/<domain>/<subpath>`
   imports (lint `no-restricted-imports` + arch test).
3. **Lazy Public Components:** If a component must be public via a gateway yet stay lazy, re-export a
   `Component.lazy.tsx` wrapper owning its own `Suspense` boundary (see `ScheduleMaintenanceModal.lazy.tsx`).
4. **Single RUM:** Faro is the only client telemetry. The SDK must be imported asynchronously (after idle); never add a
   static RUM import to the shell. `VITE_FARO_*` are baked at build time only.
5. **Zero Render-Blocking External Requests:** fonts/icons must be self-hosted (no Google Fonts `<link>`/`@import`).