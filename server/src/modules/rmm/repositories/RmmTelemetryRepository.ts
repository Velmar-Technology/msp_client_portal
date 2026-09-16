import { BaseRepository } from '@shared/repositories/BaseRepository';
import { RmmDeviceTelemetry } from '@shared/types';
import { db, rmmDeviceTelemetry, subscriptionEquipment } from '@shared/db';
import { eq, sql } from 'drizzle-orm';

export interface TelemetryUpsertPayload {
  equipment_id: string;
  tenant_id: string;
  zabbix_host_id?: string | null;
  agent_status?: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  pending_patch_count?: number;
  last_sync_at?: Date | null;
}

/**
 * Data repository managing real-time hardware telemetry records (CPU, memory, disk, online status).
 */
export class RmmTelemetryRepository extends BaseRepository<RmmDeviceTelemetry> {
  /**
   * Initializes RmmTelemetryRepository for the rmm_device_telemetry database table.
   */
  constructor() {
    super(rmmDeviceTelemetry, 'rmm_device_telemetry');
  }

  /**
   * Retrieves telemetry metrics for an equipment asset joined with device metadata.
   *
   * @param equipmentId - Equipment UUID
   * @returns RmmDeviceTelemetry entity or null
   */
  async findByEquipment(equipmentId: string): Promise<RmmDeviceTelemetry | null> {
    const results = await db
      .select({
        id: rmmDeviceTelemetry.id,
        equipment_id: rmmDeviceTelemetry.equipment_id,
        zabbix_host_id: rmmDeviceTelemetry.zabbix_host_id,
        agent_status: rmmDeviceTelemetry.agent_status,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        disk_used_gb: rmmDeviceTelemetry.disk_used_gb,
        disk_total_gb: rmmDeviceTelemetry.disk_total_gb,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
        tenant_id: rmmDeviceTelemetry.tenant_id,
        created_at: rmmDeviceTelemetry.created_at,
        updated_at: rmmDeviceTelemetry.updated_at,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
      })
      .from(rmmDeviceTelemetry)
      .innerJoin(subscriptionEquipment, eq(rmmDeviceTelemetry.equipment_id, subscriptionEquipment.id))
      .where(eq(rmmDeviceTelemetry.equipment_id, equipmentId));

    return (results[0] as RmmDeviceTelemetry) || null;
  }

  /**
   * Retrieves telemetry metrics for all devices within a tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of RmmDeviceTelemetry entities
   */
  async findByTenant(tenantId: string): Promise<RmmDeviceTelemetry[]> {
    const results = await db
      .select({
        id: rmmDeviceTelemetry.id,
        equipment_id: rmmDeviceTelemetry.equipment_id,
        zabbix_host_id: rmmDeviceTelemetry.zabbix_host_id,
        agent_status: rmmDeviceTelemetry.agent_status,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        disk_used_gb: rmmDeviceTelemetry.disk_used_gb,
        disk_total_gb: rmmDeviceTelemetry.disk_total_gb,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
        tenant_id: rmmDeviceTelemetry.tenant_id,
        created_at: rmmDeviceTelemetry.created_at,
        updated_at: rmmDeviceTelemetry.updated_at,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
      })
      .from(rmmDeviceTelemetry)
      .innerJoin(subscriptionEquipment, eq(rmmDeviceTelemetry.equipment_id, subscriptionEquipment.id))
      .where(eq(rmmDeviceTelemetry.tenant_id, tenantId));

    return results as RmmDeviceTelemetry[];
  }

  /**
   * Atomically upserts telemetry snapshot for an equipment device record.
   * Uses PostgreSQL ON CONFLICT (equipment_id) DO UPDATE in a single query.
   *
   * @param data - Telemetry metric payload
   * @returns Created or updated RmmDeviceTelemetry entity
   */
  async upsertTelemetry(data: TelemetryUpsertPayload): Promise<RmmDeviceTelemetry> {
    const updateSet: Record<string, any> = {
      updated_at: new Date(),
      last_sync_at: data.last_sync_at ?? new Date(),
    };

    if (data.zabbix_host_id !== undefined) updateSet.zabbix_host_id = data.zabbix_host_id;
    if (data.agent_status !== undefined) updateSet.agent_status = data.agent_status;
    if (data.cpu_usage !== undefined) updateSet.cpu_usage = data.cpu_usage;
    if (data.memory_usage !== undefined) updateSet.memory_usage = data.memory_usage;
    if (data.disk_usage !== undefined) updateSet.disk_usage = data.disk_usage;
    if (data.disk_used_gb !== undefined) updateSet.disk_used_gb = data.disk_used_gb;
    if (data.disk_total_gb !== undefined) updateSet.disk_total_gb = data.disk_total_gb;
    if (data.pending_patch_count !== undefined) updateSet.pending_patch_count = data.pending_patch_count;

    const results = await db
      .insert(rmmDeviceTelemetry)
      .values({
        equipment_id: data.equipment_id,
        tenant_id: data.tenant_id,
        zabbix_host_id: data.zabbix_host_id ?? null,
        agent_status: data.agent_status ?? 'ONLINE',
        cpu_usage: data.cpu_usage ?? 0,
        memory_usage: data.memory_usage ?? 0,
        disk_usage: data.disk_usage ?? 0,
        disk_used_gb: data.disk_used_gb ?? 0,
        disk_total_gb: data.disk_total_gb ?? 0,
        pending_patch_count: data.pending_patch_count ?? 0,
        last_sync_at: data.last_sync_at ?? new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: rmmDeviceTelemetry.equipment_id,
        set: updateSet,
      })
      .returning();

    return results[0] as RmmDeviceTelemetry;
  }

  /**
   * Performs an atomic multi-row upsert of hardware telemetry metrics.
   *
   * @param items - Array of telemetry metric records
   * @returns Array of created or updated RmmDeviceTelemetry entities
   */
  async upsertTelemetryBatch(items: TelemetryUpsertPayload[]): Promise<RmmDeviceTelemetry[]> {
    if (items.length === 0) {
      return [];
    }

    const rows = items.map((item) => ({
      equipment_id: item.equipment_id,
      tenant_id: item.tenant_id,
      zabbix_host_id: item.zabbix_host_id ?? null,
      agent_status: item.agent_status ?? 'ONLINE',
      cpu_usage: item.cpu_usage ?? 0,
      memory_usage: item.memory_usage ?? 0,
      disk_usage: item.disk_usage ?? 0,
      disk_used_gb: item.disk_used_gb ?? 0,
      disk_total_gb: item.disk_total_gb ?? 0,
      pending_patch_count: item.pending_patch_count ?? 0,
      last_sync_at: item.last_sync_at ?? new Date(),
      updated_at: new Date(),
    }));

    const results = await db
      .insert(rmmDeviceTelemetry)
      .values(rows)
      .onConflictDoUpdate({
        target: rmmDeviceTelemetry.equipment_id,
        set: {
          zabbix_host_id: sql`COALESCE(EXCLUDED.zabbix_host_id, rmm_device_telemetry.zabbix_host_id)`,
          agent_status: sql`COALESCE(EXCLUDED.agent_status, rmm_device_telemetry.agent_status)`,
          cpu_usage: sql`EXCLUDED.cpu_usage`,
          memory_usage: sql`EXCLUDED.memory_usage`,
          disk_usage: sql`EXCLUDED.disk_usage`,
          disk_used_gb: sql`EXCLUDED.disk_used_gb`,
          disk_total_gb: sql`EXCLUDED.disk_total_gb`,
          pending_patch_count: sql`EXCLUDED.pending_patch_count`,
          last_sync_at: sql`COALESCE(EXCLUDED.last_sync_at, NOW())`,
          updated_at: sql`NOW()`,
        },
      })
      .returning();

    return results as RmmDeviceTelemetry[];
  }
}

export const rmmTelemetryRepository = new RmmTelemetryRepository();
