# RMM Telemetry Inconsistency Handover & Architecture Context: DEV-PC-1

## 1. Incident Summary & User Problem
- **Reported Issue:** The RMM Modal in the client portal displays incorrect / stale telemetry (CPU `0%`, RAM `0%`, Storage `77 GB / 256 GB` [30%]) for endpoint **`DEV-PC-1`**, whereas live PC diagnostics show active thread utilization and **97.6% full storage (249.5 GB used / 6.0 GB free)**.
- **Goal:** Move the implementation workflow to a dedicated coding agent to bridge live Rust agent telemetry directly to the database and portal UI.

---

## 2. Target Device & Identity Topology
- **Hostname:** `DEV-PC-1`
- **Equipment Slot ID (in `subscription_equipment`):** `0b86cdb9-7698-412a-bb03-a2cb388fb184`
- **Agent Instance ID (Rust Agent UUID):** `1a5d1d8f-a941-46dc-a47d-b01ea9b16170`
- **Serial Number:** `R90X43HE` (Lenovo 20LD001HUS)
- **Tenant ID:** `ef010203-0405-0607-0809-0a0b0c0d0e0f` (Velmar Technology SRL)
- **Live Agent Status:** `ONLINE` over `wss` tunnel on `AgentGateway`.

---

## 3. Discrepancy Evidence

| Telemetry Metric | Stored Database Value (`rmm_device_telemetry`) / RMM Modal | Live Host Value (`msp-agent` via `DIAGNOSE_PC`) |
| :--- | :--- | :--- |
| **Agent Status** | `ONLINE` | `ONLINE` (WebSocket alive) |
| **CPU Usage** | `0.00%` | **51.9%** (8 cores active) |
| **Memory Usage** | `0.00%` | **48.9%** (8.31 GB used / 17.0 GB total) |
| **Disk Usage** | `30.00%` | **97.6%** (Mount `C:\` NTFS) |
| **Disk Used / Total** | `77.00 GB` / `256.00 GB` | **249.55 GB** / **255.58 GB** (~6.02 GB free) |
| **Uptime** | Static/default fallback | **190.22 hours** |

---

## 4. Root Cause Analysis

### Cause A: Modal Reads Stale Database Cache
1. In `client/src/features/equipment/components/DeviceRmmModal.tsx` (`lines 83-87`):
   ```typescript
   const cpuVal = liveTelemetry?.cpu_usage ?? equip?.cpu_usage ?? null;
   const memVal = liveTelemetry?.memory_usage ?? equip?.memory_usage ?? null;
   const diskPct = liveTelemetry?.disk_usage ?? equip?.disk_usage ?? null;
   const diskUsed = liveTelemetry?.disk_used_gb ?? equip?.disk_used_gb ?? null;
   const diskTotal = liveTelemetry?.disk_total_gb ?? equip?.disk_total_gb ?? null;
   ```
   When the modal opens, `liveTelemetry` is `null`, so it displays the seed values stored in `rmm_device_telemetry`.

### Cause B: `triggerPatchScan` Exclusively Polls Zabbix, Ignoring Connected Rust Agent
1. In `server/src/modules/rmm/services/RmmPatchService.ts` (`lines 165-175`):
   When clicking **"Scan Telemetry"** in the modal:
   ```typescript
   const zabbixHostId = await this.zabbixService.syncHost(equipmentId, equipment.device_name || 'Device');
   const metrics = await this.zabbixService.getHostTelemetry(equipmentId, zabbixHostId);
   ```
   - For `DEV-PC-1`, `zabbix_host_id` is not registered with real Zabbix agent items.
   - In `server/src/modules/rmm/services/ZabbixService.ts` (`lines 383-415`), `getHostTelemetry` falls back to either zeros (in production) or pseudo-random hash metrics (in development).
   - It **never queries the connected WebSocket agent**.

### Cause C: Rust Agent Does Not Run a Periodic `TELEMETRY_PING` Loop
1. The backend **already has** a high-throughput write-behind ingestion pipeline in `server/src/modules/rmm/services/AgentGateway.ts` (`lines 278-298`):
   ```typescript
   if ((data.command === 'TELEMETRY_PING' || data.command === 'HEARTBEAT') && data.payload) {
     this.telemetryBuffer.bufferPing({
       equipment_id: equipmentId,
       tenant_id: data.payload.tenant_id || agent.token || 'unknown',
       agent_status: 'ONLINE',
       cpu_usage: data.payload.cpu_usage,
       memory_usage: data.payload.memory_usage,
       disk_usage: data.payload.disk_usage,
       disk_used_gb: data.payload.disk_used_gb,
       disk_total_gb: data.payload.disk_total_gb,
       pending_patch_count: data.payload.pending_patch_count,
       last_sync_at: new Date(),
     });
   }
   ```
2. However, in `packages/msp-agent/src/main.rs`:
   - The agent sends `AGENT_HELLO` only on connection.
   - It does not have an interval ticker sending `TELEMETRY_PING` with live system metrics gathered via `diagnostics::gather_system_metrics()`.

### Cause D: Identifier Discrepancy between Slot ID and Agent Instance ID
1. When `msp-agent` connects, `agent_id` passed in the query param is `state.instance_id` (`1a5d1d8f-a941-46dc-a47d-b01ea9b16170`).
2. When the portal opens the modal, `equip.id` is the equipment slot UUID (`0b86cdb9-7698-412a-bb03-a2cb388fb184`).
3. In `AgentGateway.ts`:
   - `getAgentStatus` iterates across sockets matching both `agent.equipmentId === identifier || agent.slotId === identifier`.
   - `sendCommand` looks up `this.activeSockets.get(equipmentId)`. If a slot UUID is passed instead of the agent instance UUID, it misses local socket unless resolved through `resolveTarget` or slot ID matching.

---

## 5. Scope of Work for the Next Agent

### Task 1: Server-Side Scan Bridge in `RmmPatchService.ts`
- **File:** `server/src/modules/rmm/services/RmmPatchService.ts`
- **Changes:**
  1. Inject `AgentGateway` (or use `agentGateway`) in `RmmPatchService`.
  2. In `triggerPatchScan(equipmentId, tenantId, byAdmin)`:
     - Check if the agent is online via `agentGateway.getAgentStatus(equipmentId)` or by looking up `equipment.agent_instance_id`.
     - If the agent is online, dispatch `sendCommand(targetAgentId, 'DIAGNOSE_PC', undefined, 10_000)`.
     - Extract `cpu.global_usage_pct`, `memory.usage_pct`, disk metrics (primary mount `C:\`), and uptime.
     - Persist the real metrics into `this.telemetryRepository.upsertTelemetry(...)` and touch `subscription_equipment`.
     - Only fall back to Zabbix if the agent is not connected.

### Task 2: Robust Slot ID Resolution in `AgentGateway.ts`
- **File:** `server/src/modules/rmm/services/AgentGateway.ts`
- **Changes:**
  - Update `sendCommand(equipmentId, ...)` to find the socket by either `agent.equipmentId === equipmentId` OR `agent.slotId === equipmentId`, matching the lookup logic in `getAgentStatus`.

### Task 3: Background Telemetry Ticker in `msp-agent` (Rust)
- **File:** `packages/msp-agent/src/main.rs`
- **Changes:**
  - In `run_session`: spawn a lightweight Tokio interval task (e.g. every 60 seconds) or use a select loop to transmit `TELEMETRY_PING`:
    ```json
    {
      "correlation_id": "<uuid>",
      "command": "TELEMETRY_PING",
      "payload": {
        "cpu_usage": 51.9,
        "memory_usage": 48.9,
        "disk_usage": 97.6,
        "disk_used_gb": 249.5,
        "disk_total_gb": 255.6,
        "uptime_hours": 190.22
      }
    }
    ```
  - This ensures `TelemetryBufferService` automatically keeps Redis and PostgreSQL up to date without manual scans.

---

## 6. Verification Checklist
1. Run backend build & tests:
   ```powershell
   npm -w server run build
   npm -w server test -- RmmPatchService
   ```
2. Trigger scan via API or MCP:
   - Run `POST /api/rmm/devices/0b86cdb9-7698-412a-bb03-a2cb388fb184/patches/scan`.
   - Verify returned telemetry reflects CPU ~50%, RAM ~48%, Storage 97.6% (249 GB / 256 GB).
3. Verify client modal in browser or unit test:
   - Open RMM modal for `DEV-PC-1`.
   - Confirm CPU, Memory, and Storage match live telemetry.
