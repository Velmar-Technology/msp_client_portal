# ADR-007: Composite Client Health Scoring (BL-601), Live Telemetry Verification, and Zero Standing Privileges REST Gateway

## Status
Accepted

## Date
2026-09-10

## Context
During an automated data integrity and MCP toolchain audit of the MSP Client Portal platform, several systemic discrepancies and architectural gaps were surfaced across the telemetry, hardware provisioning, and authorization layers:

1. **Phantom Online Statuses:** Endpoints without active WebSocket connections retained stale `ONLINE` status in both `rmm_device_telemetry` and `subscription_equipment` tables even when the last recorded check-in was days or weeks old.
2. **Zombie Duplicate Slot Allocations:** On failed or incomplete workstation OTP pairing, half-bound `PENDING_ACTIVATION` slots retained duplicate hardware serial numbers (`device_serial`) and Nextcloud credentials alongside the active slot, breaking the 1-to-1 physical endpoint invariant (BL-205).
3. **Missing BL-601 Health Scoring API:** While BL-601 was codified in repository rules ($H = 0.40 S_{\text{ticket}} + 0.30 S_{\text{hardware}} + 0.30 S_{\text{security}}$), no first-class domain service or REST gateway endpoint (`/system/health/:tenantId`) existed to compute and surface composite account health reports and flag Quarterly Business Review (QBR) reviews when scores dropped below 70%.
4. **Unexposed ZSP Ephemeral Elevation Routes:** The core Zero Standing Privileges domain services (`EphemeralAccessService`, `ContinuousAdaptiveTrustService`, `HybridPolicyEngine`) lacked HTTP REST routes in the API gateway, preventing automated tools and administrative clients from executing Just-In-Time (JIT) privilege requests and querying PDP access decisions over HTTP.
5. **Client Directory Omission in MCP Adapter:** The MCP client only discovered client organizations that possessed active hardware telemetry rows, silently omitting registered users holding the `CLIENT` role who had not yet linked equipment.

---

## Decision

### 1. Real-Time Telemetry Gating & Recency Windows
We updated the RMM and equipment subsystems to enforce strict multi-vector status verification:
* **Live Socket Introspection:** [AgentGateway.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/server/src/modules/rmm/services/AgentGateway.ts) now exposes `isAgentConnected(identifier)` and enriches `getAgentStatus(identifier)` to search across active sockets by equipment ID, slot ID, and agent instance UUID.
* **15-Minute Inactivity Fallback:** [EquipmentService.resolveLiveAgentStatus](file:///c:/Users/eapolanco/Workspace/msp_client_portal/server/src/modules/equipment/services/EquipmentService.ts) evaluates both WebSocket connection state and the most recent timestamp (`last_sync_at` vs. `agent_last_seen_at`). If no WebSocket is open and telemetry is older than 15 minutes ($\text{RECENCY\_WINDOW\_MS} = 900,000$), the device status is dynamically coerced to `OFFLINE`.
* **MCP Tool Calibration:** [MspApiClient.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/packages/mcp-server/src/client/MspApiClient.ts) counts devices as `onlineDevices` only when `agent_status === 'ONLINE'` and activity is recorded within the 15-minute threshold.

### 2. Slot Invariant Rollback & Automated Unbinding
* **Pristine Rollback on Failure:** `EquipmentService.bindAndActivateSlot` wraps pairing mutations in an explicit catch block that zeroes out `device_name`, `device_serial`, `agent_token`, `nextcloud_username`, and `nextcloud_password` if Nextcloud credential generation or telemetry seeding encounters an error.
* **Auto-Reconciliation Sweep:** Added `EquipmentService.reconcileEquipmentSlots()` to scan all slots across active subscriptions. Any slot in `PENDING_ACTIVATION` holding a `device_serial` that is already actively bound to an `ACTIVE` slot is automatically scrubbed of credentials and returned to an unlinked, pristine pairing state. This sweep executes automatically when administrators list devices.

### 3. Dedicated BL-601 Client Health Scoring Domain Service
Created [ClientHealthService.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/server/src/modules/system/services/ClientHealthService.ts) implementing the canonical composite formula:
$$H = 0.40 \times S_{\text{ticket}} + 0.30 \times S_{\text{hardware}} + 0.30 \times S_{\text{security}}$$

* **Ticket Health ($S_{\text{ticket}}$):** Starts at 100%. Deducts 25 points per unworked CRITICAL ticket, 5 points per open standard ticket, and 20 points for SLA escalation breaches (e.g. CRITICAL > 10m, HIGH > 20m per BL-104).
* **Hardware Health ($S_{\text{hardware}}$):** Starts at 100%. Deducts 15 points per inactive device (> 7 days), 15 points for critical disk usage (> 85%), and 10 points for memory strain (> 90%).
* **Security Health ($S_{\text{security}}$):** Starts at 100%. Deducts 8 points per pending unpatched vulnerability.
* **QBR Actionable Triggers:** If $H < 70\%$, the report automatically appends: `"Account health is below 70% threshold. Immediate Quarterly Business Review (QBR) required (BL-601)."`.
* **API Route:** Exposed via `GET /api/v1/system/health/:tenantId` with RBAC protection for `ADMIN`, `TECHNICIAN`, and the tenant's own `CLIENT` users.

### 4. Zero Standing Privileges (ZSP) HTTP REST Dispatcher
Created [authz.routes.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/server/src/modules/auth/routes/authz.routes.ts) and mounted on `gatewayClusterRouter.use('/authz', authzRoutes)`:
* `POST /api/v1/authz/ephemeral/request` — Creates time-limited, audited JIT elevation requests.
* `GET /api/v1/authz/ephemeral/grants` — Lists active ephemeral grants for the authenticated tenant or all tenants (Admin).
* `POST /api/v1/authz/ephemeral/grants/:id/revoke` — Immediately terminates elevated privileges and revokes Zanzibar tuples.
* `POST /api/v1/authz/decision` — Evaluates Policy-as-Code and ReBAC tuples for any subject/relation/object tuple.
* `GET /api/v1/authz/trust-score` — Returns the real-time continuous adaptive trust and risk score.

---

## Consequences

### Positive
* **Operational Accuracy:** Operations dashboards, RMM monitoring panels, and MCP automated agents now report true hardware connectivity without false-positive online readings.
* **Zero Slot Collisions:** Workstation serial numbers can never be accidentally dual-allocated across physical endpoint slots.
* **vCIO Proactive Engagement:** MSP account managers have an instantaneous, standardized health audit score to drive client QBRs and identify at-risk contracts before renewal churn.
* **Audit-Ready ZSP:** Security compliance frameworks (SOC2, ISO 27001) are satisfied through fully auditable, HTTP-accessible ephemeral elevation logs and immediate session revocation.

### Negative / Trade-offs
* **Strict Recency Dependency:** Endpoints behind low-frequency telemetry intervals (>15m) may appear offline until their next scheduled heartbeat. 15 minutes was selected as the optimal equilibrium between alert responsiveness and network overhead.
