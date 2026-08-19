import { BaseRepository } from '@shared/repositories/BaseRepository';
import { RmmDeviceTelemetry } from '@shared/types';
import { db, rmmDeviceTelemetry, subscriptionEquipment } from '@shared/db';
import { eq } from 'drizzle-orm';

export class RmmTelemetryRepository extends BaseRepository<RmmDeviceTelemetry> {
  constructor() {
    super(rmmDeviceTelemetry, 'rmm_device_telemetry');
  }

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

  async upsertTelemetry(data: {
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
  }): Promise<RmmDeviceTelemetry> {
    const existing = await db
      .select()
      .from(rmmDeviceTelemetry)
      .where(eq(rmmDeviceTelemetry.equipment_id, data.equipment_id));

    if (existing.length > 0) {
      const results = await db
        .update(rmmDeviceTelemetry)
        .set({
          zabbix_host_id: data.zabbix_host_id !== undefined ? data.zabbix_host_id : existing[0].zabbix_host_id,
          agent_status: data.agent_status ?? existing[0].agent_status,
          cpu_usage: data.cpu_usage !== undefined ? data.cpu_usage : existing[0].cpu_usage,
          memory_usage: data.memory_usage !== undefined ? data.memory_usage : existing[0].memory_usage,
          disk_usage: data.disk_usage !== undefined ? data.disk_usage : existing[0].disk_usage,
          disk_used_gb: data.disk_used_gb !== undefined ? data.disk_used_gb : existing[0].disk_used_gb,
          disk_total_gb: data.disk_total_gb !== undefined ? data.disk_total_gb : existing[0].disk_total_gb,
          pending_patch_count: data.pending_patch_count !== undefined ? data.pending_patch_count : existing[0].pending_patch_count,
          last_sync_at: data.last_sync_at ?? new Date(),
          updated_at: new Date(),
        })
        .where(eq(rmmDeviceTelemetry.equipment_id, data.equipment_id))
        .returning();
      return results[0] as RmmDeviceTelemetry;
    }

    const results = await db
      .insert(rmmDeviceTelemetry)
      .values({
        equipment_id: data.equipment_id,
        tenant_id: data.tenant_id,
        zabbix_host_id: data.zabbix_host_id || null,
        agent_status: data.agent_status ?? 'ONLINE',
        cpu_usage: data.cpu_usage ?? 0,
        memory_usage: data.memory_usage ?? 0,
        disk_usage: data.disk_usage ?? 0,
        disk_used_gb: data.disk_used_gb ?? 0,
        disk_total_gb: data.disk_total_gb ?? 0,
        pending_patch_count: data.pending_patch_count ?? 0,
        last_sync_at: data.last_sync_at ?? new Date(),
      })
      .returning();
    return results[0] as RmmDeviceTelemetry;
  }
}

export const rmmTelemetryRepository = new RmmTelemetryRepository();
