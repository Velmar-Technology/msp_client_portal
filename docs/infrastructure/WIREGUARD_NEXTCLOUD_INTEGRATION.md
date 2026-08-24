# Infrastructure Specification: Velmar MSP ↔ TrueNAS/Nextcloud WireGuard Integration

_Status: Deployed & Active · Last Verified: 2026-08-24_

---

## 1. Overview & Business Objective

The MSP Client Portal provides automated cloud storage provisioning and backup quotas (25 GB per device slot) to clients via an external **Nextcloud** instance running on **TrueNAS SCALE** (`cloud-storage-srv-1`).

Because the customer TrueNAS environment is situated behind a **dynamic WAN IP** with no public port forwards exposed on customer perimeter firewalls, a persistent **WireGuard Site-to-Client Tunnel** connects the helpdesk VPS hub with the TrueNAS host.

### Core Goals
1. **Internal Application Access**: Allow backend container (`msp_server_prod`) to execute WebDAV provisioning and OCS user administration against Nextcloud over a dedicated private IP (`10.13.13.3:30027`).
2. **Customer Remote Access**: Publish customer access at `https://cloud.velmartech.com.do` via VPS Traefik reverse proxy routed through the WireGuard tunnel.
3. **Resilience**: Immune to dynamic ISP WAN/LAN address renewals and customer NAT state changes.

---

## 2. Architecture & Network Topology

```
Customer Desktop / Browser / Mobile
                │
         [ HTTPS / TLS ]
                ▼
VPS Ingress (Traefik v3) [172.235.145.77]
                │
       [ reverse-proxy net ]
                ▼
VPS Nginx Gateway (`cloud_gateway` / Stack 18)
                │
                │ WireGuard Hub (`10.13.13.1` / Stack 14)
                │ [ Encrypted UDP:51820 over Internet ]
                ▼
TrueNAS Host (`cloud_wg_client` / Stack 19) [`10.13.13.3`]
                │
       [ Local Host Port :30027 ]
                ▼
ix-nextcloud App Container (`172.16.1.5:80`)
```

### IP Allocation Table

| Node | Interface / Role | IP Address | Subnet / Scope | Notes |
|---|---|---|---|---|
| **Helpdesk VPS (Linode)** | `eth0` (WAN) | `172.235.145.77` | Public WAN | Traefik entrypoint (`443`, `80`, `9443`) |
| **WireGuard Hub** | `wg0` (Hub) | `10.13.13.1` | `10.13.13.0/24` | `network_mode: host`, UDP port 51820 |
| **Road Warrior Peer** | `wg0` (mypcs) | `10.13.13.2` | `/32` | Administrative peer |
| **TrueNAS SCALE Host** | `wg0` (cloud-wg) | `10.13.13.3` | `/32` | Container `cloud_wg_client` in host netns |
| **TrueNAS LAN** | `eno1` (LAN) | `10.0.0.254` | `10.0.0.0/24` | Default gateway `10.0.0.1` |
| **Nextcloud Container** | `ix-nextcloud` | `172.16.1.5` | Docker bridge | Published to host port `30027` |

---

## 3. Portainer Environment & Stacks

| Endpoint ID | Endpoint Name | Type | Host Details |
|---|---|---|---|
| **3** | `local` | Standalone Docker | Linode VPS (`172.235.145.77`) |
| **4** | `cloud-storage-srv-1` | Edge Agent | TrueNAS SCALE (`10.0.0.254`) |

### Deployed Stacks Overview

1. **Stack 14 (`wireguard`) on Endpoint 3**:
   * Image: `linuxserver/wireguard:latest`
   * Network: `network_mode: host`
   * Config: `/config/wg_confs/wg0.conf` in volume `wireguard_config`
   * Peer for TrueNAS: AllowedIPs = `10.13.13.3/32`, `PersistentKeepalive = 25`

2. **Stack 18 (`cloud-gateway`) on Endpoint 3**:
   * Image: `nginx:alpine`
   * Network: `reverse-proxy` (Traefik external network)
   * Routing: `proxy_pass http://10.13.13.3:30027;`
   * Traefik Labels:
     * `traefik.http.routers.nextcloud-cloud.rule=Host(\`cloud.velmartech.com.do\`)`
     * `traefik.http.routers.nextcloud-cloud.entrypoints=websecure`
     * `traefik.http.routers.nextcloud-cloud.tls.certresolver=myresolver`
     * `traefik.http.routers.nextcloud-cloud.middlewares=nextcloud-sec@docker`

3. **Stack 19 (`cloud-wg`) on Endpoint 4 (TrueNAS)**:
   * Image: `linuxserver/wireguard:latest`
   * Capabilities: `CAP_NET_ADMIN`, device `/dev/net/tun`
   * Network: `network_mode: host`
   * Config: `/config/wg_confs/wg0.conf` connecting to `172.235.145.77:51820`, Address = `10.13.13.3/32`, AllowedIPs = `10.13.13.0/24`

4. **Stack 17 (`msp_portal`) on Endpoint 3**:
   * Environment Variable: `NEXTCLOUD_URL=10.13.13.3:30027`
   * Service Account: `NEXTCLOUD_APP_USER=msp_client_portal`

---

## 4. Nextcloud Application Configuration

The Nextcloud instance running on TrueNAS SCALE is configured with:

```bash
# Executed via occ inside container ix-nextcloud-nextcloud-1
trusted_domains:
  - 0: 10.0.0.254
  - 1: 127.0.0.1
  - 2: localhost
  - 3: nextcloud
  - 4: 190.80.130.192 (legacy)
  - 5: cloud.velmartech.com.do
  - 6: 10.13.13.3

trusted_proxies:
  - 10.13.13.1

overwrite.cli.url: https://cloud.velmartech.com.do
overwriteprotocol: https
```

---

## 5. Operations & Diagnostics Runbook

All automation and troubleshooting scripts are located in [`scripts/infra/wireguard/`](file:///scripts/infra/wireguard/):

### 1. Tunnel Health Check
```powershell
$env:PORTAINER_URL="https://helpdesk.velmartech.com.do:9443"
$env:PORTAINER_API_KEY="<PORTAINER_API_KEY>"

# Check peer status and bytes transferred on Hub
node scripts/infra/wireguard/run-in.mjs 3 wireguard wg show wg0

# Check peer status on TrueNAS client
node scripts/infra/wireguard/run-in.mjs 4 cloud_wg_client wg show wg0
```

### 2. Nextcloud Endpoint Probe
```powershell
# Probe Nextcloud HTTP status via Gateway proxy
node scripts/infra/wireguard/run-in.mjs 3 cloud_gateway wget -qO- --timeout=5 http://10.13.13.3:30027/status.php
```

### 3. Application WebDAV & OCS Verification
```powershell
# Verify Nextcloud user provisioning API from msp_server_prod
node scripts/infra/wireguard/run-in.mjs 3 msp_server_prod node -e "
const auth = Buffer.from(process.env.NEXTCLOUD_APP_USER + ':' + process.env.NEXTCLOUD_APP_PASS).toString('base64');
fetch('http://10.13.13.3:30027/ocs/v1.php/cloud/users?format=json', {
  headers: { 'Authorization': 'Basic ' + auth, 'OCS-APIRequest': 'true' }
}).then(r => r.json()).then(console.log);
"
```

---

## 6. Troubleshooting & Common Pitfalls

### Issue 1: Missing Kernel Routes after `wg syncconf`
* **Symptom**: Handshakes succeed, but data traffic fails (0 bytes received).
* **Cause**: `wg syncconf` reloads peers into the kernel but does not install IP routing table entries (which `wg-quick up` normally does).
* **Fix**: Ensure host routing table has the link route:
  ```bash
  ip route add 10.13.13.3/32 dev wg0
  ```

### Issue 2: TrueNAS IPv4 Default Route Drop
* **Symptom**: Edge Agent (endpoint 4) becomes unreachable; WireGuard handshake drops.
* **Cause**: TrueNAS SCALE DHCP renewal without router default gateway.
* **Fix**: Add static route or static IPv4 in TrueNAS UI:
  ```bash
  ip route add default via 10.0.0.1 dev eno1 metric 100
  ```
