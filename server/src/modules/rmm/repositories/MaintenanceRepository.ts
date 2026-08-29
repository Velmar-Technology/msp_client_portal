import { BaseRepository } from '@shared/repositories/BaseRepository';
import { DeviceMaintenance } from '@shared/types';
import { db, deviceMaintenances, subscriptionEquipment, subscriptions, users } from '@shared/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';


const techUser = alias(users, 'techUser');
const clientUser = alias(users, 'clientUser');

/**
 * Data repository managing device maintenance schedule records, relational joins with equipment, client, tech, and subscriptions.
 */
export class MaintenanceRepository extends BaseRepository<DeviceMaintenance> {
  /**
   * Initializes MaintenanceRepository for the device_maintenances database table.
   */
  constructor() {
    super(deviceMaintenances, 'device_maintenances');
  }

  /**
   * Retrieves maintenance schedules matching tenant boundary and query filters.
   *
   * @param tenantId - Optional tenant UUID filter
   * @param filters - Optional date range, client, tech, equipment, and status criteria
   * @returns Array of enriched DeviceMaintenance entities
   */
  async findByTenant(
    tenantId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      clientId?: string;
      techId?: string;
      equipmentId?: string;
      status?: string;
    }
  ): Promise<DeviceMaintenance[]> {
    const conditions = [];

    if (tenantId) {
      conditions.push(eq(deviceMaintenances.tenant_id, tenantId));
    }

    if (filters?.startDate) {
      conditions.push(gte(deviceMaintenances.scheduled_date, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(deviceMaintenances.scheduled_date, filters.endDate));
    }
    if (filters?.clientId) {
      conditions.push(eq(deviceMaintenances.client_id, filters.clientId));
    }
    if (filters?.techId) {
      conditions.push(eq(deviceMaintenances.assigned_tech_id, filters.techId));
    }
    if (filters?.equipmentId) {
      conditions.push(eq(deviceMaintenances.equipment_id, filters.equipmentId));
    }
    if (filters?.status) {
      conditions.push(eq(deviceMaintenances.status, filters.status));
    }

    const query = db
      .select({
        id: deviceMaintenances.id,
        equipment_id: deviceMaintenances.equipment_id,
        subscription_id: deviceMaintenances.subscription_id,
        client_id: deviceMaintenances.client_id,
        tenant_id: deviceMaintenances.tenant_id,
        assigned_tech_id: deviceMaintenances.assigned_tech_id,
        scheduled_date: deviceMaintenances.scheduled_date,
        status: deviceMaintenances.status,
        title: deviceMaintenances.title,
        notes: deviceMaintenances.notes,
        maintenance_type: deviceMaintenances.maintenance_type,
        created_by: deviceMaintenances.created_by,
        created_at: deviceMaintenances.created_at,
        updated_at: deviceMaintenances.updated_at,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        client_name: clientUser.name,
        client_email: clientUser.email,
        assigned_tech_name: techUser.name,
        service_name: subscriptions.service_name,
      })
      .from(deviceMaintenances)
      .innerJoin(subscriptionEquipment, eq(deviceMaintenances.equipment_id, subscriptionEquipment.id))
      .innerJoin(subscriptions, eq(deviceMaintenances.subscription_id, subscriptions.id))
      .innerJoin(clientUser, eq(deviceMaintenances.client_id, clientUser.id))
      .leftJoin(techUser, eq(deviceMaintenances.assigned_tech_id, techUser.id));

    const results = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(deviceMaintenances.scheduled_date))
      : await query.orderBy(desc(deviceMaintenances.scheduled_date));

    return results as DeviceMaintenance[];
  }

  /**
   * Retrieves a single maintenance schedule by UUID joined with equipment, subscription, client, and tech details.
   *
   * @param id - Maintenance UUID
   * @param tenantId - Optional tenant UUID
   * @returns Enriched DeviceMaintenance entity or null
   */
  async findByIdWithDetails(id: string, tenantId?: string): Promise<DeviceMaintenance | null> {
    const conditions = [eq(deviceMaintenances.id, id)];
    if (tenantId) {
      conditions.push(eq(deviceMaintenances.tenant_id, tenantId));
    }

    const results = await db
      .select({
        id: deviceMaintenances.id,
        equipment_id: deviceMaintenances.equipment_id,
        subscription_id: deviceMaintenances.subscription_id,
        client_id: deviceMaintenances.client_id,
        tenant_id: deviceMaintenances.tenant_id,
        assigned_tech_id: deviceMaintenances.assigned_tech_id,
        scheduled_date: deviceMaintenances.scheduled_date,
        status: deviceMaintenances.status,
        title: deviceMaintenances.title,
        notes: deviceMaintenances.notes,
        maintenance_type: deviceMaintenances.maintenance_type,
        created_by: deviceMaintenances.created_by,
        created_at: deviceMaintenances.created_at,
        updated_at: deviceMaintenances.updated_at,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        client_name: clientUser.name,
        client_email: clientUser.email,
        assigned_tech_name: techUser.name,
        service_name: subscriptions.service_name,
      })
      .from(deviceMaintenances)
      .innerJoin(subscriptionEquipment, eq(deviceMaintenances.equipment_id, subscriptionEquipment.id))
      .innerJoin(subscriptions, eq(deviceMaintenances.subscription_id, subscriptions.id))
      .innerJoin(clientUser, eq(deviceMaintenances.client_id, clientUser.id))
      .leftJoin(techUser, eq(deviceMaintenances.assigned_tech_id, techUser.id))
      .where(and(...conditions));

    return (results[0] as DeviceMaintenance) || null;
  }

  /**
   * Retrieves all maintenance records associated with a specific equipment slot.
   *
   * @param equipmentId - Equipment UUID
   * @returns Array of DeviceMaintenance entities
   */
  async findByEquipmentId(equipmentId: string): Promise<DeviceMaintenance[]> {
    const results = await db
      .select()
      .from(deviceMaintenances)
      .where(eq(deviceMaintenances.equipment_id, equipmentId))
      .orderBy(desc(deviceMaintenances.scheduled_date));
    return results as DeviceMaintenance[];
  }

  /**
   * Inserts a new maintenance schedule record.
   *
   * @param data - Creation attributes
   * @returns Created DeviceMaintenance entity
   */
  async create(data: {
    equipment_id: string;
    subscription_id: string;
    client_id: string;
    tenant_id: string;
    assigned_tech_id?: string | null;
    scheduled_date: Date;
    status?: string;
    title: string;
    notes?: string | null;
    maintenance_type?: string;
    created_by?: string | null;
  }): Promise<DeviceMaintenance> {
    const results = await db
      .insert(deviceMaintenances)
      .values(data)
      .returning();
    return results[0] as DeviceMaintenance;
  }

  /**
   * Updates fields on an existing maintenance schedule.
   *
   * @param id - Maintenance UUID
   * @param data - Partial update attributes
   * @returns Updated DeviceMaintenance entity or null
   */
  async update(id: string, data: Partial<DeviceMaintenance>): Promise<DeviceMaintenance | null> {
    const results = await db
      .update(deviceMaintenances)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(deviceMaintenances.id, id))
      .returning();
    return (results[0] as DeviceMaintenance) || null;
  }

  /**
   * Deletes a maintenance schedule record.
   *
   * @param id - Maintenance UUID
   * @param tenantId - Optional tenant UUID
   * @returns True if deleted
   */
  async delete(id: string, tenantId?: string): Promise<boolean> {
    const conditions = [eq(deviceMaintenances.id, id)];
    if (tenantId) {
      conditions.push(eq(deviceMaintenances.tenant_id, tenantId));
    }

    const results = await db
      .delete(deviceMaintenances)
      .where(and(...conditions))
      .returning();
    return results.length > 0;
  }
}

export const maintenanceRepository = new MaintenanceRepository();
