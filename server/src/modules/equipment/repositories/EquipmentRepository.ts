import { BaseRepository } from '@shared/repositories/BaseRepository';
import { SubscriptionEquipment, EquipmentWithDetails } from '@shared/types';
import { db, subscriptionEquipment, subscriptions, users, tenants, rmmDeviceTelemetry } from '@shared/db';
import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';

/**
 * Data repository managing hardware equipment slots, agent binding credentials, and relational telemetry joins.
 */
export class EquipmentRepository extends BaseRepository<SubscriptionEquipment> {
  /**
   * Initializes EquipmentRepository for the subscription_equipment database table.
   */
  constructor() {
    super(subscriptionEquipment, 'subscription_equipment');
  }

  /**
   * Retrieves all hardware slots for a subscription joined with RMM telemetry metrics.
   *
   * @param subscriptionId - Subscription UUID
   * @returns Array of SubscriptionEquipment slots with telemetry
   */
  async findBySubscription(subscriptionId: string): Promise<SubscriptionEquipment[]> {
    const results = await db
      .select({
        id: subscriptionEquipment.id,
        subscription_id: subscriptionEquipment.subscription_id,
        slot_index: subscriptionEquipment.slot_index,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        agent_instance_id: subscriptionEquipment.agent_instance_id,
        agent_hostname: subscriptionEquipment.agent_hostname,
        agent_serial: subscriptionEquipment.agent_serial,
        agent_last_seen_at: subscriptionEquipment.agent_last_seen_at,
        otp: subscriptionEquipment.otp,
        otp_expires_at: subscriptionEquipment.otp_expires_at,
        nextcloud_username: subscriptionEquipment.nextcloud_username,
        nextcloud_password: subscriptionEquipment.nextcloud_password,
        tenant_id: subscriptionEquipment.tenant_id,
        agent_status: rmmDeviceTelemetry.agent_status,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        disk_used_gb: rmmDeviceTelemetry.disk_used_gb,
        disk_total_gb: rmmDeviceTelemetry.disk_total_gb,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
        created_at: subscriptionEquipment.created_at,
        updated_at: sql<Date>`COALESCE(${rmmDeviceTelemetry.last_sync_at}, ${rmmDeviceTelemetry.updated_at}, ${subscriptionEquipment.updated_at})`.as('updated_at'),
      })
      .from(subscriptionEquipment)
      .leftJoin(rmmDeviceTelemetry, eq(subscriptionEquipment.id, rmmDeviceTelemetry.equipment_id))
      .where(eq(subscriptionEquipment.subscription_id, subscriptionId))
      .orderBy(subscriptionEquipment.slot_index);
    return results as SubscriptionEquipment[];
  }

  /**
   * Finds a specific hardware slot by subscription UUID and zero-indexed slot position.
   *
   * @param subscriptionId - Subscription UUID
   * @param slotIndex - Slot position index
   * @returns SubscriptionEquipment entity or null
   */
  async findBySlot(subscriptionId: string, slotIndex: number): Promise<SubscriptionEquipment | null> {
    const results = await db
      .select()
      .from(subscriptionEquipment)
      .where(
        and(
          eq(subscriptionEquipment.subscription_id, subscriptionId),
          eq(subscriptionEquipment.slot_index, slotIndex)
        )
      );
    return (results[0] as SubscriptionEquipment) || null;
  }

  /**
   * Locates a slot by its 6-digit one-time pairing OTP code.
   *
   * @param otp - 6-digit pairing code
   * @returns SubscriptionEquipment entity or null
   */
  async findByOtp(otp: string): Promise<SubscriptionEquipment | null> {
    const results = await db
      .select()
      .from(subscriptionEquipment)
      .where(eq(subscriptionEquipment.otp, otp));
    return (results[0] as SubscriptionEquipment) || null;
  }

  /**
   * Locates the slot bound to a physical agent installation (its stable
   * install UUID). Returns all columns including the per-device secret so the
   * service can enforce the token gate during reconciliation.
   *
   * @param agentInstanceId - Agent instance UUID
   * @returns SubscriptionEquipment entity or null
   */
  async findByAgentInstanceId(agentInstanceId: string): Promise<SubscriptionEquipment | null> {
    if (!agentInstanceId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(agentInstanceId)) {
      return null;
    }
    const results = await db
      .select()
      .from(subscriptionEquipment)
      .where(eq(subscriptionEquipment.agent_instance_id, agentInstanceId));
    return (results[0] as SubscriptionEquipment) || null;
  }

  /**
   * Inserts a new equipment slot record.
   *
   * @param data - Slot attributes
   * @returns Created SubscriptionEquipment entity
   */
  async create(data: {
    subscription_id: string;
    slot_index: number;
    status: 'PENDING_ACTIVATION' | 'ACTIVE';
    device_name?: string;
    device_serial?: string;
    agent_instance_id?: string | null;
    agent_hostname?: string | null;
    agent_serial?: string | null;
    agent_last_seen_at?: Date | null;
    agent_token?: string | null;
    otp?: string | null;
    otp_expires_at?: Date | null;
    nextcloud_username?: string | null;
    nextcloud_password?: string | null;
    tenant_id: string;
  }): Promise<SubscriptionEquipment> {
    const results = await db
      .insert(subscriptionEquipment)
      .values(data)
      .returning();
    return results[0] as SubscriptionEquipment;
  }

  /**
   * Updates fields on an existing equipment slot.
   *
   * @param id - Slot UUID
   * @param data - Partial update attributes
   * @returns Updated SubscriptionEquipment entity or null
   */
  async update(id: string, data: Partial<SubscriptionEquipment>): Promise<SubscriptionEquipment | null> {
    const results = await db
      .update(subscriptionEquipment)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(subscriptionEquipment.id, id))
      .returning();
    return (results[0] as SubscriptionEquipment) || null;
  }

  /**
   * Applies agent-discovered identity to a device slot. Because the remote agent
   * is the authoritative source of truth, the visible device_name/device_serial
   * are overwritten alongside the agent_* audit columns when detected.
   *
   * @param id - Equipment slot UUID
   * @param identity - Discovered hostname, serial, and last seen timestamp
   * @returns Updated SubscriptionEquipment entity or null
   */
  async updateAgentIdentity(
    id: string,
    identity: {
      hostname?: string | null;
      serial?: string | null;
      lastSeenAt: Date;
    }
  ): Promise<SubscriptionEquipment | null> {
    const set: Record<string, unknown> = {
      agent_last_seen_at: identity.lastSeenAt,
      updated_at: new Date(),
    };
    if (identity.hostname !== undefined) {
      set.agent_hostname = identity.hostname;
      set.device_name = identity.hostname;
    }
    if (identity.serial !== undefined) {
      set.agent_serial = identity.serial;
      set.device_serial = identity.serial;
    }
    const results = await db
      .update(subscriptionEquipment)
      .set(set)
      .where(eq(subscriptionEquipment.id, id))
      .returning();
    return (results[0] as SubscriptionEquipment) || null;
  }

  /**
   * Retrieves active devices belonging to a client user across active/expiring subscriptions.
   *
   * @param clientId - Client user UUID
   * @param tenantId - Tenant UUID
   * @returns Array of active SubscriptionEquipment entities
   */
  async findActiveByClient(clientId: string, tenantId: string): Promise<SubscriptionEquipment[]> {
    const results = await db
      .select({
        id: subscriptionEquipment.id,
        subscription_id: subscriptionEquipment.subscription_id,
        slot_index: subscriptionEquipment.slot_index,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        agent_instance_id: subscriptionEquipment.agent_instance_id,
        agent_hostname: subscriptionEquipment.agent_hostname,
        agent_serial: subscriptionEquipment.agent_serial,
        agent_last_seen_at: subscriptionEquipment.agent_last_seen_at,
        otp: subscriptionEquipment.otp,
        otp_expires_at: subscriptionEquipment.otp_expires_at,
        nextcloud_username: subscriptionEquipment.nextcloud_username,
        nextcloud_password: subscriptionEquipment.nextcloud_password,
        tenant_id: subscriptionEquipment.tenant_id,
        agent_status: rmmDeviceTelemetry.agent_status,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        disk_used_gb: rmmDeviceTelemetry.disk_used_gb,
        disk_total_gb: rmmDeviceTelemetry.disk_total_gb,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
        created_at: subscriptionEquipment.created_at,
        updated_at: sql<Date>`COALESCE(${rmmDeviceTelemetry.last_sync_at}, ${rmmDeviceTelemetry.updated_at}, ${subscriptionEquipment.updated_at})`.as('updated_at'),
      })
      .from(subscriptionEquipment)
      .leftJoin(rmmDeviceTelemetry, eq(subscriptionEquipment.id, rmmDeviceTelemetry.equipment_id))
      .innerJoin(subscriptions, eq(subscriptionEquipment.subscription_id, subscriptions.id))
      .where(
        and(
          eq(subscriptions.client_id, clientId),
          or(
            eq(subscriptions.status, 'ACTIVE'),
            eq(subscriptions.status, 'EXPIRING')
          ),
          eq(subscriptionEquipment.status, 'ACTIVE'),
          eq(subscriptionEquipment.tenant_id, tenantId)
        )
      )
      .orderBy(subscriptionEquipment.device_name);
    return results as SubscriptionEquipment[];
  }

  /**
   * Retrieves all devices globally joined with user, subscription, tenant, and telemetry details (Admin view).
   *
   * @returns Array of enriched EquipmentWithDetails entities
   */
  async findAllWithDetails(): Promise<EquipmentWithDetails[]> {
    const results = await db
      .select({
        id: subscriptionEquipment.id,
        subscription_id: subscriptionEquipment.subscription_id,
        slot_index: subscriptionEquipment.slot_index,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        agent_instance_id: subscriptionEquipment.agent_instance_id,
        agent_hostname: subscriptionEquipment.agent_hostname,
        agent_serial: subscriptionEquipment.agent_serial,
        agent_last_seen_at: subscriptionEquipment.agent_last_seen_at,
        otp: subscriptionEquipment.otp,
        otp_expires_at: subscriptionEquipment.otp_expires_at,
        nextcloud_username: subscriptionEquipment.nextcloud_username,
        nextcloud_password: subscriptionEquipment.nextcloud_password,
        tenant_id: subscriptionEquipment.tenant_id,
        agent_status: rmmDeviceTelemetry.agent_status,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        disk_used_gb: rmmDeviceTelemetry.disk_used_gb,
        disk_total_gb: rmmDeviceTelemetry.disk_total_gb,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
        created_at: subscriptionEquipment.created_at,
        updated_at: sql<Date>`COALESCE(${rmmDeviceTelemetry.last_sync_at}, ${rmmDeviceTelemetry.updated_at}, ${subscriptionEquipment.updated_at})`.as('updated_at'),
        client_name: users.name,
        client_email: users.email,
        client_role: users.role,
        service_name: subscriptions.service_name,
        plan: subscriptions.plan,
        tenant_name: tenants.name,
        subscription_status: subscriptions.status,
      })
      .from(subscriptionEquipment)
      .leftJoin(rmmDeviceTelemetry, eq(subscriptionEquipment.id, rmmDeviceTelemetry.equipment_id))
      .innerJoin(subscriptions, eq(subscriptionEquipment.subscription_id, subscriptions.id))
      .innerJoin(users, eq(subscriptions.client_id, users.id))
      .innerJoin(tenants, eq(subscriptionEquipment.tenant_id, tenants.id))
      .where(
        and(
          inArray(users.role, ['CLIENT', 'ADMIN']),
          or(
            eq(subscriptions.status, 'ACTIVE'),
            eq(subscriptions.status, 'EXPIRING')
          )
        )
      )
      .orderBy(desc(subscriptionEquipment.created_at));
    return results as EquipmentWithDetails[];
  }

  /**
   * Retrieves a single device by ID joined with client, subscription, and telemetry details.
   *
   * @param id - Equipment slot UUID
   * @returns EquipmentWithDetails entity or null
   */
  async findByIdWithDetails(id: string): Promise<EquipmentWithDetails | null> {
    const results = await db
      .select({
        id: subscriptionEquipment.id,
        subscription_id: subscriptionEquipment.subscription_id,
        slot_index: subscriptionEquipment.slot_index,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        agent_instance_id: subscriptionEquipment.agent_instance_id,
        agent_hostname: subscriptionEquipment.agent_hostname,
        agent_serial: subscriptionEquipment.agent_serial,
        agent_last_seen_at: subscriptionEquipment.agent_last_seen_at,
        otp: subscriptionEquipment.otp,
        otp_expires_at: subscriptionEquipment.otp_expires_at,
        nextcloud_username: subscriptionEquipment.nextcloud_username,
        nextcloud_password: subscriptionEquipment.nextcloud_password,
        tenant_id: subscriptionEquipment.tenant_id,
        agent_status: rmmDeviceTelemetry.agent_status,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        disk_used_gb: rmmDeviceTelemetry.disk_used_gb,
        disk_total_gb: rmmDeviceTelemetry.disk_total_gb,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
        created_at: subscriptionEquipment.created_at,
        updated_at: sql<Date>`COALESCE(${rmmDeviceTelemetry.last_sync_at}, ${rmmDeviceTelemetry.updated_at}, ${subscriptionEquipment.updated_at})`.as('updated_at'),
        client_name: users.name,
        client_email: users.email,
        client_role: users.role,
        service_name: subscriptions.service_name,
        plan: subscriptions.plan,
        tenant_name: tenants.name,
        subscription_status: subscriptions.status,
      })
      .from(subscriptionEquipment)
      .leftJoin(rmmDeviceTelemetry, eq(subscriptionEquipment.id, rmmDeviceTelemetry.equipment_id))
      .innerJoin(subscriptions, eq(subscriptionEquipment.subscription_id, subscriptions.id))
      .innerJoin(users, eq(subscriptions.client_id, users.id))
      .innerJoin(tenants, eq(subscriptionEquipment.tenant_id, tenants.id))
      .where(eq(subscriptionEquipment.id, id));
    return (results[0] as EquipmentWithDetails) || null;
  }

  /**
   * Retrieves all equipment slots associated with a tenant UUID.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of SubscriptionEquipment entities
   */
  async findByTenantId(tenantId: string): Promise<SubscriptionEquipment[]> {
    const results = await db
      .select()
      .from(subscriptionEquipment)
      .where(eq(subscriptionEquipment.tenant_id, tenantId));
    return results as SubscriptionEquipment[];
  }

  /**
   * Retrieves all active equipment devices for a tenant joined with telemetry.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of active SubscriptionEquipment entities
   */
  async findActiveByTenant(tenantId: string): Promise<SubscriptionEquipment[]> {
    const results = await db
      .select({
        id: subscriptionEquipment.id,
        subscription_id: subscriptionEquipment.subscription_id,
        slot_index: subscriptionEquipment.slot_index,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        agent_instance_id: subscriptionEquipment.agent_instance_id,
        agent_hostname: subscriptionEquipment.agent_hostname,
        agent_serial: subscriptionEquipment.agent_serial,
        agent_last_seen_at: subscriptionEquipment.agent_last_seen_at,
        otp: subscriptionEquipment.otp,
        otp_expires_at: subscriptionEquipment.otp_expires_at,
        nextcloud_username: subscriptionEquipment.nextcloud_username,
        nextcloud_password: subscriptionEquipment.nextcloud_password,
        tenant_id: subscriptionEquipment.tenant_id,
        agent_status: rmmDeviceTelemetry.agent_status,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        disk_used_gb: rmmDeviceTelemetry.disk_used_gb,
        disk_total_gb: rmmDeviceTelemetry.disk_total_gb,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
        created_at: subscriptionEquipment.created_at,
        updated_at: sql<Date>`COALESCE(${rmmDeviceTelemetry.last_sync_at}, ${rmmDeviceTelemetry.updated_at}, ${subscriptionEquipment.updated_at})`.as('updated_at'),
      })
      .from(subscriptionEquipment)
      .leftJoin(rmmDeviceTelemetry, eq(subscriptionEquipment.id, rmmDeviceTelemetry.equipment_id))
      .where(
        and(
          eq(subscriptionEquipment.status, 'ACTIVE'),
          eq(subscriptionEquipment.tenant_id, tenantId)
        )
      )
      .orderBy(subscriptionEquipment.device_name);
    return results as SubscriptionEquipment[];
  }

  /**
   * Finds an equipment slot by its machine agent token, including subscription owner details.
   *
   * @param token - Machine agent secret token
   * @returns Equipment slot with linked client_id and tenant_id, or null if not found
   */
  async findByAgentToken(token: string): Promise<{
    equipment: SubscriptionEquipment;
    clientId: string;
    tenantId: string;
  } | null> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }

    const results = await db
      .select({
        equipment: subscriptionEquipment,
        clientId: subscriptions.client_id,
        tenantId: subscriptionEquipment.tenant_id,
      })
      .from(subscriptionEquipment)
      .innerJoin(subscriptions, eq(subscriptionEquipment.subscription_id, subscriptions.id))
      .where(eq(subscriptionEquipment.agent_token, token))
      .limit(1);

    if (results.length === 0) return null;
    return results[0];
  }
}

export const equipmentRepository = new EquipmentRepository();
