# Refined Architecture & Spec: Hosted Multi-Tenant Vaultwarden for MSP

## 1. Executive Summary & Problem Framing
**How Might We** deliver an enterprise-grade, zero-knowledge password manager feature (`PASSWORD_MANAGER` in `featureCatalog.ts`) to MSP client tenants using a single lightweight container, automated invitation onboarding, subpath Traefik routing, and strict lifecycle alignment with Dominican/MSP commercial terms (BL-702 non-payment scale)?

---

## 2. Core Decisions & Convergence

| Dimension | Decision | Rationale |
| :--- | :--- | :--- |
| **Container Topology** | **Single `vaultwarden/server:alpine` container** | Extremely lightweight (~30–50MB RAM, Rust-based). Operates comfortably alongside `msp_server_prod`, `db`, and `zabbix` on the Linode VPS. |
| **Data Segregation** | **Bitwarden Organizations & Collections** | Zero-knowledge cryptographic isolation. Each MSP tenant gets their own isolated **Organization**. Vault items, department collections, and user access remain completely sealed per tenant. |
| **Ingress & Routing** | **Subpath: `https://helpdesk.velmartech.com.do/vault/`** | Fronted by existing Traefik v3. Configured with `DOMAIN=https://helpdesk.velmartech.com.do/vault` so web vault, WebSocket notifications (`/notifications/hub`), and extension sync function seamlessly. |
| **User Provisioning** | **Asynchronous Email Invitations via Bitwarden Org API** | Password managers are zero-knowledge; the MSP cannot (and should not) know master passwords. On subscription activation, the portal creates the Organization and sends Bitwarden invite emails directly to users. |
| **Non-Payment Scale (BL-702)** | **Day 5 READ_ONLY, Day 15 SUSPENDED, Day 30 PURGED** | Managed via Vaultwarden Admin REST API: deactivates users on Day 15 (`SUSPENDED`), revokes/deletes organization and vault collections on Day 30 (`PURGED`) for liability liberation. |

---

## 3. Architecture & Container Configuration

### Traefik & Docker Topology
```
                     ┌────────────────────────────── VPS (Linode) ──────────────────────────────┐
                     │                                                                          │
  Internet ──:443──► │ Traefik v3 (`reverse-proxy`)                                            │
                     │   ├── /api, /uploads      ──► msp_server_prod (:3001)                   │
                     │   ├── /                   ──► msp_client_prod (:80)                     │
                     │   ├── /vault              ──► msp_vaultwarden (:80)                     │
                     │   │   └─ websocket hub    ──► msp_vaultwarden (:3012)                   │
                     │   └── /grafana, /zabbix   ──► internal tools                            │
                     │                                                                          │
                     │  Container: `msp_vaultwarden`                                            │
                     │  Volume: `vaultwarden_data:/data`                                        │
                     │  DB Backend: Fast WAL SQLite volume or attached to Postgres              │
                     └──────────────────────────────────────────────────────────────────────────┘
```

### Vaultwarden Compose Service Definition
```yaml
  vaultwarden:
    image: vaultwarden/server:alpine
    container_name: msp_vaultwarden
    restart: always
    environment:
      - DOMAIN=https://helpdesk.velmartech.com.do/vault
      - SIGNUPS_ALLOWED=false                  # Strict closed registration
      - INVITATIONS_ALLOWED=true               # Allowed via Org invite only
      - SHOW_PASSWORD_HINT=false
      - ADMIN_TOKEN=${VAULTWARDEN_ADMIN_TOKEN} # Secret key for MSP Portal backend calls
      - WEBSOCKET_ENABLED=true
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_FROM=${SMTP_USER}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_SECURITY=starttls
      - SMTP_USERNAME=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
    volumes:
      - vaultwarden_data:/data
    networks:
      - default
      - reverse-proxy
    deploy:
      resources:
        limits:
          cpus: '0.20'
          memory: 120M
        reservations:
          cpus: '0.02'
          memory: 30M
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.msp-vault.rule=Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/vault`)"
      - "traefik.http.routers.msp-vault.entrypoints=websecure"
      - "traefik.http.routers.msp-vault.tls=true"
      - "traefik.http.routers.msp-vault.tls.certresolver=myresolver"
      - "traefik.http.routers.msp-vault.priority=100"
      - "traefik.http.services.msp-vault-svc.loadbalancer.server.port=80"
```

---

## 4. Lifecycle & Domain Integration Workflow

### 1. Subscription Activation (`BL-401` / `featureCatalog.ts`)
- **Trigger**: Client purchases or activates plan with feature code `PASSWORD_MANAGER` (e.g. *Individual Work Vault*, *Team Business Vault*, or *Enterprise Vault*).
- **Action**: `VaultwardenProvisioningService`:
  1. Calls Vaultwarden Admin/Org API: ensures tenant organization exists (e.g., `org_<tenant_id>`).
  2. Sets Organization policies according to the tier (e.g. Enterprise Vault enforces Master Password Complexity & 2FA).
  3. Pre-creates department Collections (e.g. `Finance`, `Executive`, `Operations`) if `vaultSharing: 'Secure Department Folders'`.
  4. Triggers invitation emails to target client team members.

### 2. Day-to-Day User Experience
- **Client Portal**: New "Password Manager" tab in client navigation. Shows status, quick launch link to `/vault/#/login`, invited members count, and setup guides for browser extensions (Chrome, Edge, Firefox, iOS, Android).

### 3. Non-Payment Scale Enforcement (`BL-702`)
- **Day 5 (`READ_ONLY`)**:
  - Portal blocks administrative edits (adding new users/seats to the organization).
- **Day 15 (`SUSPENDED`)**:
  - `NonPaymentSuspensionService` calls Vaultwarden API to **deactivate** users in the tenant organization, blocking vault logins while preserving ciphertext vaults.
- **Day 30 (`PURGED`)**:
  - `NonPaymentSuspensionService.purgeTenantData(tenantId)`:
    - Calls Vaultwarden API to delete the tenant Organization and purge vault records.
    - Zero liability and storage liberation per Dominican contract terms.
- **Payment Settlement**:
  - If paid before Day 30, accounts are instantly **re-activated**.

---

## 5. Assumptions & Constraints to Validate

- [ ] **Subpath extension compatibility**: Modern Bitwarden browser extensions and mobile apps support server URLs with subpaths (e.g., `https://helpdesk.velmartech.com.do/vault`), provided the `DOMAIN` env var is configured in Vaultwarden.
- [ ] **Vaultwarden API surface**: Vaultwarden exposes the standard Bitwarden API plus an `/admin` endpoint. Using an admin session token or Bitwarden API key allows clean programmatic creation of organizations and invitations.
- [ ] **Database selection**: SQLite in Alpine Vaultwarden uses minimal resources (<30MB RAM) with WAL mode, perfectly suited for MSP scale (<500 users) without adding connection pool overhead to Postgres.

---

## 6. What We Are NOT Doing (Explicit Non-Goals)

1. **Not storing master passwords in the database**: We will never touch or escrow raw client master passwords; zero-knowledge principles are non-negotiable.
2. **Not spinning up a separate container per client**: Running 20+ separate Vaultwarden containers would waste RAM and Traefik router table space. One container with Bitwarden Organizations achieves the exact same cryptographic isolation.
3. **Not allowing open public signups**: `SIGNUPS_ALLOWED=false` prevents random Internet users from creating vaults on Velmartech's server.
