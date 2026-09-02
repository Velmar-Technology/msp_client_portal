# Infrastructure Specification: MSP Client Portal Production Stack

_Status: Deployed & Active · Last Verified: 2026-08-27 · Version: 1.0_

---

## 1. Overview & Topology

The **MSP Client Portal** runs as a single Docker Compose stack on the helpdesk VPS (Linode `172.235.145.77`) and is managed by **Portainer CE** (`https://helpdesk.velmartech.com.do:9443`, endpoint **3 `local`**, stack **17 `msp_portal`**, type Compose).

- **Source of truth:** [`docker-compose.prod.yml`](../../docker-compose.prod.yml) at the repository root. The stack content in Portainer is the exact file — the CI pipeline and manual redeploys push this file to Portainer verbatim.
- **Public ingress:** Traefik v3.6.4 (Portainer stack **3 `traefik`**) terminates TLS via Let's Encrypt (`myresolver`) for `helpdesk.velmartech.com.do` and reverse-proxies path prefixes to the internal containers over the shared `reverse-proxy` network.
- **App images:** `ghcr.io/velmar-technology/msp-services-server:<VERSION>` and `ghcr.io/velmar-technology/msp-services-client:<VERSION>` (reference tags are `:latest` + long SHA, built by GitHub Actions).
- **Stack lifecycle:** Portainer owns the stack. Deploys pin `VERSION` into the stack environment and re-submit the repo compose spec via the Portainer REST API (see §7).
- **Related infra:** WireGuard hub / TrueNAS / Nextcloud routing and the credentials matrix live in [`WIREGUARD_NEXTCLOUD_INTEGRATION.md`](WIREGUARD_NEXTCLOUD_INTEGRATION.md). Live secrets are **not** duplicated here — see that document's §3.4 credentials reference and Portainer → stack environment.

---

## 2. Service Reference

All services restart automatically (`restart: always` unless noted) and share the `default` bridge network unless stated otherwise. Resource limits are `deploy.resources` (Compose non-swarm, honored by bare `docker compose`).

| Compose service | Container | Image (as deployed 2026-08-27) | Role / Notes | Limits CPU / Mem | Healthcheck |
|---|---|---|---|---|---|
| `db` | `msp_postgres_db_prod` | `postgres:16-alpine` | Primary application database (`msp_helpdesk`) | 0.40 / 250M | `pg_isready` (10s/5s/5) |
| `server` | `msp_server_prod` | `ghcr.io/velmar-technology/msp-services-server:1.6.0` | Express API (internal port **3001**); depends on `db` healthy; mount `uploads_data` | 0.50 / 300M | `GET http://127.0.0.1:3001/api/v1/health` (30s/10s/3, start 40s) |
| `zabbix-db` | `msp_zabbix_db_prod` | `postgres:16-alpine` | Zabbix monitoring database | 0.40 / 380M | `pg_isready -U zabbix -d zabbix` |
| `zabbix-server` | `msp_zabbix_server_prod` | `zabbix/zabbix-server-pgsql:alpine-6.0-latest` | Zabbix core (6.0 LTS); **publishes `10051:10051`** (agent ingress); depends on `zabbix-db` healthy | 0.30 / 200M | — |
| `zabbix-web` | `msp_zabbix_web_prod` | `zabbix/zabbix-web-nginx-pgsql:alpine-6.0-latest` (6.0.48) | Zabbix frontend; serves the SPA + API on internal port **8080**; exposed at `/zabbix/` via Traefik; also on `reverse-proxy` | 0.25 / 150M | — |
| `zabbix-agent` | `msp_zabbix_agent_prod` | `zabbix/zabbix-agent2:alpine-6.0-latest` | Agent2 monitoring the Zabbix stack itself; `network_mode: service:zabbix-server` (no own IP) | 0.10 / 80M | — |
| `client` | `msp_client_prod` | `ghcr.io/velmar-technology/msp-services-client:1.6.0` | React SPA + nginx on internal port **80**; catch-all route; depends on `server` healthy; also on `reverse-proxy` | 0.15 / 64M | `wget --spider http://127.0.0.1/` |
| `logs` | `msp_portal_logs` | `amir20/dozzle:latest` | Container log viewer (`/logs`); `DOZZLE_BASE=/logs`, `DOZZLE_FILTER=label=com.docker.compose.project=msp_portal`; mounts `/var/run/docker.sock` RO; `restart: unless-stopped` | 0.10 / 80M | — |
| `prometheus` | `msp_prometheus` | `prom/prometheus:v2.54.0` | Metrics scrape: `prometheus`, `traefik:8080`, `msp-server /api/v1/metrics`, `alloy:12345`; retention 15d; `--web.route-prefix=/prometheus`, external URL `/prometheus`; runs as `user 0:0` | 0.20 / 150M | — |
| `alloy` | `msp_alloy` | `grafana/alloy:v1.2.0` | Faro frontend-telemetry receiver: `faro.receiver` on **12347** (payload limit 10MiB, CORS origin `https://helpdesk.velmartech.com.do`), HTTP metrics on **12345**; ingress `/collect` | 0.15 / 100M | — |
| `grafana` | `msp_grafana` | `grafana/grafana-oss:latest` | Dashboards; `GF_SERVER_ROOT_URL=https://helpdesk.velmartech.com.do/grafana/`, `SERVE_FROM_SUB_PATH=true`; preinstalls `alexanderzobnin-zabbix-app`; SMTP from shared SMTP vars | 0.25 / 180M | — |
| `vaultwarden` | `msp_vaultwarden` | `vaultwarden/server:alpine` | Multi-tenant Bitwarden password manager; zero-knowledge encryption; subpath `/vault`; attached to `reverse-proxy` | 0.20 / 120M | — |
| _(traefik)_ | — | `traefik:v3.6.4` | **External stack 3** — TLS termination + routing (not part of this stack) | — | — |

> Note: `db` and `zabbix-db` use the same `postgres:16-alpine` image but separate encrypted volumes (see §3) — no data overlap.

---

## 3. Networks & Volumes

### Networks

| Name | Type | Scope | Used by |
|---|---|---|---|
| `default` | bridge | this stack | all 12 services |
| `reverse-proxy` | bridge, **external** | managed by Traefik stack 3 | `server`, `zabbix-web`, `client`, `logs`, `prometheus`, `alloy`, `grafana` |

### Topology

```
                      ┌────────────────────────────── VPS (172.235.145.77) ──────────────────────────────┐
       Internet       │                                                                                  │
  ────────►  Traefik (stack 3, :80/:443)  ─── reverse-proxy network ───┐                                  │
                      │   │                                             │                                  │
                      │   │  /api /uploads            → msp-server-svc    :3001  msp_server_prod          │
                      │   │  /                        → msp-client-svc    :80    msp_client_prod          │
                      │   │  /zabbix  (auth+strip)    → msp-zabbix-svc    :8080  msp_zabbix_web_prod       │
                      │   │  /logs    (auth)          → msp-logs-svc      :8080  msp_portal_logs          │
                      │   │  /prometheus (auth)       → msp-prometheus-svc :9090  msp_prometheus           │
                      │   │  /collect                 → msp-faro-svc       :12347 msp_alloy                │
                      │   │  /grafana                 → msp-grafana-svc    :3000  msp_grafana              │
                      │   │                                                                                │
                      │   │  zabbix-server publishes :10051 → agent ingress (WAN)                          │
                      └───┴─────────────────────────────────────────────────────────────────────────────┘
```

### Volumes

| Volume | Driver | Mounted in |
|---|---|---|
| `pgdata` | local | `db` → `/var/lib/postgresql/data` |
| `uploads_data` | local | `server` → `/app/server/uploads` |
| `zabbix_pgdata` | local | `zabbix-db` → `/var/lib/postgresql/data` |
| `prometheus_data` | local | `prometheus` → `/prometheus` |
| `grafana_data` | local | `grafana` → `/var/lib/grafana` |
| `alloy_data` | local | `alloy` → `/var/lib/alloy/data` |
| `vaultwarden_data` | local | `vaultwarden` → `/data` |

---

## 4. Traefik Routing Matrix

All routers use `entrypoints=websecure`, `tls=true`, `certresolver=myresolver` (Let's Encrypt) and are defined as container labels inside this stack.

| Router | Rule | Priority | Middlewares (in order) | LB port |
|---|---|---|---|---|
| `msp-server` | `` Host(`helpdesk.velmartech.com.do`) && (PathPrefix(`/api`) \|\| PathPrefix(`/uploads`)) `` | 100 | `msp-compress` | 3001 |
| `msp-client` | `` Host(`helpdesk.velmartech.com.do`) `` | **1** (catch-all) | `msp-compress` | 80 |
| `msp-zabbix` | `` Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/zabbix`) `` | 100 | `msp-zabbix-redirect` → `zabbix-auth` → `msp-zabbix-strip` | 8080 |
| `msp-logs` | `` Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/logs`) `` | 100 | `logs-auth` | 8080 |
| `msp-prometheus` | `` Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/prometheus`) `` | 100 | `prom-auth` | 9090 |
| `msp-faro` | `` Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/collect`) `` | 100 | — | 12347 |
| `msp-grafana` | `` Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/grafana`) `` | 100 | — | 3000 |
| `msp-vault` | `` Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/vault`) `` | 100 | — | 80 |

### Middlewares

| Middleware | Type | Definition |
|---|---|---|
| `msp-compress` | `compress` | `true` (used by `msp-server` and `msp-client`) |
| `msp-zabbix-redirect` | `redirectregex` | RegEx `^(https?://[^/]+)/zabbix([?#].*)?$` → replacement `${1}/zabbix/${2}` (307) |
| `msp-zabbix-strip` | `stripprefix` | `prefixes=/zabbix` |
| `zabbix-auth` / `logs-auth` / `prom-auth` | `basicauth` | `admin:<bcrypt>` **— the same bcrypt hash is shared across Zabbix, Dozzle and Prometheus** (see §8 security notes) |

### TLS & certs

Certificates are issued by Traefik (stack 3) via `myresolver`; no cert configuration lives in this stack. Routers reference Traefik's labels only — keep `reverse-proxy` external to Traefik's own network.

---

## 5. Zabbix Subpath Fix (root cause + current labels)

### Symptom

`GET https://helpdesk.velmartech.com.do/zabbix` returned **404** from nginx while the API (`POST /api_jsonrpc.php`) worked.

### Root cause

The Zabbix nginx container **only serves its app at `/`** (`location / { try_files $uri $uri/ =404; }`, docroot `/usr/share/zabbix`). A plain Traefik forward without path rewriting passed `/zabbix` unchanged → nginx 404. Traefik labels were syntactically correct; the routing was the problem.

### Fix (applied 2026-08-27)

A redirect + strip chain on the `msp-zabbix` router (labels on `zabbix-web` in `docker-compose.prod.yml`). **Compose doubles every `$`** (`$$`) so the rendered labels contain single `$`:

```yaml
# compose form (doubled $)                                            # rendered at runtime
traefik.http.middlewares.msp-zabbix-redirect.redirectregex.regex=^(https?://[^/]+)/zabbix([?#].*)?$$      # .../zabbix([?#].*)?$
traefik.http.middlewares.msp-zabbix-redirect.redirectregex.replacement=$${1}/zabbix/$${2}                  # ${1}/zabbix/${2}
traefik.http.middlewares.msp-zabbix-strip.stripprefix.prefixes=/zabbix
traefik.http.routers.msp-zabbix.middlewares=msp-zabbix-redirect,zabbix-auth,msp-zabbix-strip
```

### Behaviour

1. `/zabbix` → **307** → `/zabbix/` (missing slash is non-negotiable: Zabbix 6.0.48 assets are relative — `assets/…`, `js/…` — so prefix stripping only works with the trailing slash).
2. `/zabbix/` → `zabbix-auth` → **401** without valid basic-auth credentials.
3. Authenticated → `/zabbix` stripped by `msp-zabbix-strip` → nginx serves the app.

---

## 6. Environment Variable Reference

Values are supplied by the **Portainer stack environment** (persisted in the Portainer stack configuration) and the `${VAR}` placeholders in `docker-compose.prod.yml` fall back to their inline defaults. **Live secrets live in Portainer, not this document.**

> **Note on Frontend (`client`):** The `client` container runs Nginx serving pre-compiled static assets. All `VITE_*` variables (`VITE_GOOGLE_CLIENT_ID`, `VITE_PAYPAL_CLIENT_ID`, `VITE_DD_*`, `VITE_FARO_*`) are baked into the JavaScript bundle at **image build time** via Docker build args (`client/Dockerfile`) and are not required at container runtime in `docker-compose.prod.yml`.

| Group | Variables |
|---|---|
| Deployment | `VERSION` (pinned image tag), `REPOSITORY_OWNER` (default `velmar-technology`) |
| Database | `DB_USER` (default `postgres`), `DB_PASSWORD`, `DB_NAME` (default `msp_helpdesk`), `DB_HOST=db`, `DB_PORT=5432` |
| Auth / CORS | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=https://helpdesk.velmartech.com.do` |
| SMTP | `SMTP_HOST` (Gmail), `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD` |
| WhatsApp (opt-in) | `WHATSAPP_API_URL`, `WHATSAPP_API_KEY` (empty unless configured) |
| Google OAuth | `GOOGLE_CLIENT_ID` (server) / `VITE_GOOGLE_CLIENT_ID` (client build arg) |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (server) / `VITE_PAYPAL_CLIENT_ID` (client build arg) |
| Nextcloud | `NEXTCLOUD_URL=10.13.13.3:30027`, `NEXTCLOUD_APP_USER`, `NEXTCLOUD_APP_PASS`, `NEXTCLOUD_TOTAL_CAPACITY`, `NEXTCLOUD_EXTERNAL_URL=https://atlas.velmartech.com.do` |
| Zabbix | `ZABBIX_URL=http://zabbix-web:8080/api_jsonrpc.php`, `ZABBIX_USER=Admin`, `ZABBIX_PASSWORD`, `ZABBIX_WEBHOOK_SECRET`, `ZABBIX_DB_USER/PASSWORD/NAME` (defaults `zabbix` / `zabbix_password` / `zabbix`) |
| Datadog (opt-in) | Server APM: `DD_API_KEY`, `DD_SITE`, `DD_SERVICE`, `DD_ENV`, `DD_VERSION`, `DD_TRACE_ENABLED`, `DD_AGENT_HOST` / Client RUM (build args): `VITE_DD_*` |
| Grafana | `GRAFANA_ADMIN_PASSWORD` — overrides the fallback in compose; **ensure it is overridden** in the Portainer env |
| Faro / Telemetry (client build) | `VITE_FARO_URL`, `VITE_FARO_APP_NAME`, `VITE_FARO_APP_ENV` (baked at build time) |
| Timezones | `TZ` (OS/Server/Postgres) and `PHP_TZ` (Zabbix Web) (`America/Santo_Domingo`) |

---

## 7. Deployment & Rollback

### CI pipeline (canonical)

`.github/workflows/deploy.yml` — triggered by tag `v*` push or `workflow_dispatch`:

```
prepare → quality-gates (lint/typecheck/test)
        → build-server + build-client (ghcr :<version>/:<sha>/:latest, SBOM)
        → security-scan (Trivy HIGH/CRITICAL gate, SARIF)
        → build-agent-binaries + create-release (tags only)
        → [deploy-production: environment "production" MANUAL APPROVAL]
        → notify (DEPLOY_WEBHOOK_URL)
```

`deploy-production` steps:
1. **Capture rollback point** — reads the running `msp_server_prod` tag via the Portainer Docker API.
2. **Pre-warm GHCR pulls** on the VPS over SSH (best-effort; requires one-time `docker login ghcr.io` with a `read:packages` PAT).
3. **Update stack** — `bash scripts/portainer-stack-update.sh "${VERSION}"`.
4. **Health verify** — `docker exec msp_server_prod node -e "fetch('http://127.0.0.1:3001/api/v1/health')…"` (12×5s).
5. **Auto-rollback** — on update or health failure, re-runs the updater with `PREVIOUS_VERSION`.

Required secrets: `PORTAINER_URL`, `PORTAINER_API_KEY` (`ptr_…`), `PORTAINER_ENDPOINT_ID=3`, `PORTAINER_STACK_ID=17`, `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `VITE_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_ID`, `VITE_PAYPAL_CLIENT_ID`, `DEPLOY_WEBHOOK_URL`. `PORTAINER_TLS_INSECURE=true` tolerates Portainer's self-signed cert (flip to `false` once CA-signed).

### Update script

[`scripts/portainer-stack-update.js`](../../scripts/portainer-stack-update.js) (wrapped by `portainer-stack-update.sh`) reads `docker-compose.prod.yml`, merges `VERSION` into the existing stack env, then `PUT /api/stacks/{id}?endpointId={id}` with `stackFileContent` + `prune:true` + `pullImage:true`. Auth: `X-API-Key` with a `Bearer`-JWT fallback.

### Manual redeploy

```bash
# Linux/macOS (or in GitHub Actions)
export PORTAINER_URL='https://helpdesk.velmartech.com.do:9443'
export PORTAINER_API_KEY='<ptr_...>'
export PORTAINER_ENDPOINT_ID='3'
export PORTAINER_STACK_ID='17'
export PORTAINER_TLS_INSECURE='true'
bash scripts/portainer-stack-update.sh "1.6.0"
```

```powershell
# Windows (PowerShell)
$env:PORTAINER_URL='https://helpdesk.velmartech.com.do:9443'
$env:PORTAINER_API_KEY='<ptr_...>'
$env:PORTAINER_ENDPOINT_ID='3'
$env:PORTAINER_STACK_ID='17'
$env:PORTAINER_TLS_INSECURE='true'
node scripts/portainer-stack-update.js "1.6.0"
```

Portainer UI equivalent: **Stacks → `msp_portal` → Edit stack** (paste updated compose) → **Pull & redeploy**.

### Rollback

Manual rollback mirrors a deploy with the previous `VERSION` tag; the CI pipeline performs the same re-pin automatically. Because `prune:true` removes unused stack images/containers, the previously-deployed image may need re-pulling — the updater sets `pullImage:true`, so `ghcr.io/velmar-technology/msp-services-*:<prev>` is fetched on demand.

---

## 8. Operations & Troubleshooting

### Health & endpoint matrix

| URL (base `https://helpdesk.velmartech.com.do`) | Auth | Purpose |
|---|---|---|
| `/` | portal login | Client SPA |
| `/api/v1/health` | none | Server API liveness |
| `/zabbix/` | basic-auth | Zabbix frontend |
| `/logs` | basic-auth | Dozzle container logs (filtered to this stack) |
| `/prometheus` | basic-auth | Prometheus web UI |
| `/grafana/` | Grafana login | Grafana dashboards (Zabbix plugin preinstalled) |
| `/collect` | none | Faro telemetry ingest (POST) — no UI |

### Quick diagnostics (Portainer-backed exec)

```powershell
$env:PORTAINER_URL="https://helpdesk.velmartech.com.do:9443"
$env:PORTAINER_API_KEY="<ptr_...>"
Set-Location "C:\Users\PC\AppData\Local\Temp\opencode\ptx"

# Stack container list + health state
node run-in.mjs 3 msp_server_prod node -e "fetch('http://127.0.0.1:3001/api/v1/health').then(r=>console.log(r.status))"

# Inspect a service's resolved image version
node -e "import('./papi.mjs').then(async({j})=>{const r=await j('GET','/api/endpoints/3/docker/containers/msp_server_prod/json');console.log(r.json.Config.Image,r.json.Config.Labels['traefik.http.routers.msp-server.rule'])})"

# Zabbix end-to-end through its own nginx (bypasses Traefik)
node run-in.mjs 3 msp_zabbix_web_prod sh -c "wget -qO- --timeout=8 http://127.0.0.1:8080/ | head -c 200"

# Live container logs (single service)
node run-in.mjs 3 msp_alloy sh -c "tail -n 50 /var/log/* 2>/dev/null | tail -n 50"
```

### Troubleshooting table

| Symptom | Likely cause | Fix |
|---|---|---|
| `/zabbix` → 404, `/zabbix/` works | Missing redirect (visited without slash) | Router must keep the `msp-zabbix-redirect` middleware; navigate to `/zabbix/` |
| `/zabbix` → 401 loop | Basic-auth rejects | Credentials are `admin` + the bcrypt hash in the `zabbix-auth` label / credentials matrix; review §3.4 of `WIREGUARD_NEXTCLOUD_INTEGRATION.md` |
| `msp-zabbix` router disabled in Traefik | Malformed label `$` escaping when pasting compose manually | Compose requires `$$` for literal `$` — redeploy the file verbatim from the repo |
| Portainer PUT times out (≥10m) | Large Zabbix DB volume / slow GHCR pull | CI pre-warms pulls first; tune `timeout-minutes` if WAN Egress degrades |
| Prometheus `/prometheus` asset 404 | Missing `--web.route-prefix=/prometheus` / external URL | Already set in the entrypoint; re-verify after image upgrade |
| Grafana redirects to `https://helpdesk.velmartech.com.do/grafana` + ROOT | URL mismatch | `GF_SERVER_ROOT_URL` includes trailing slash; `SERVE_FROM_SUB_PATH=true` required |
| Client / `/` doesn't load assets | nginx serving the SPA needs the fallback; image built with wrong `VITE_*` args | Rebuild client with correct build args in CI; nginx `try_files` config lives in the client Dockerfile |

### Security notes

- **Shared basic-auth hash:** `zabbix-auth`, `logs-auth` and `prom-auth` reuse the **same** `admin` bcrypt hash from the compose labels. Rotate to distinct per-app hashes (`htpasswd -bnBC 10 admin '<pw>'`; mind `$$` escaping in Compose).
- **Portainer TLS:** self-signed cert currently trusted blindly (`PORTAINER_TLS_INSECURE=true`) in CI — disable once Portainer is fronted by Traefik with a CA-signed cert.
- **Grafana fallback:** `GF_SECURITY_ADMIN_PASSWORD` has an inline default fallback in compose — verify the per-app value in the Portainer stack env overrides it.
- **Zabbix defaults:** Zabbix API user/password and DB credentials are stack env vars (`zabbix` defaults in compose); keep overridden in Portainer. Zabbix UI admin account is the `admin` basic-auth realm only at the proxy; the Zabbix app itself uses its own (`Admin`) login.
- **Live credentials** (Portainer key, TruNAS, Nextcloud app, WireGuard keys) are the responsibility of [`WIREGUARD_NEXTCLOUD_INTEGRATION.md`](WIREGUARD_NEXTCLOUD_INTEGRATION.md) §3.4 and the Portainer env — never paste them into issue/discussion channels.

---

_Last updated: 2026-08-27 (initial release · Zabbix `/zabbix/` subpath fix documented) · Author: Infrastructure Team · Review cycle: Quarterly_