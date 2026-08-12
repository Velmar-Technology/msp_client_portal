import { BaseRepository } from './BaseRepository';
import { SubscriptionEquipment, EquipmentWithDetails } from '../types';
import { db, subscriptionEquipment, subscriptions, users, tenants } from '../db';
import { eq, and, or, desc } from 'drizzle-orm';

export class EquipmentRepository extends BaseRepository<SubscriptionEquipment> {
  constructor() {
    super(subscriptionEquipment, 'subscription_equipment');
  }

  async findBySubscription(subscriptionId: string): Promise<SubscriptionEquipment[]> {
    const results = await db
      .select()
      .from(subscriptionEquipment)
      .where(eq(subscriptionEquipment.subscription_id, subscriptionId))
      .orderBy(subscriptionEquipment.slot_index);
    return results as SubscriptionEquipment[];
  }

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

  async findByOtp(otp: string): Promise<SubscriptionEquipment | null> {
    const results = await db
      .select()
      .from(subscriptionEquipment)
      .where(eq(subscriptionEquipment.otp, otp));
    return (results[0] as SubscriptionEquipment) || null;
  }

  async create(data: {
    subscription_id: string;
    slot_index: number;
    status: 'PENDING_ACTIVATION' | 'ACTIVE';
    device_name?: string;
    device_serial?: string;
    otp?: string;
    otp_expires_at?: Date;
    nextcloud_username?: string;
    nextcloud_password?: string;
    tenant_id: string;
  }): Promise<SubscriptionEquipment> {
    const results = await db
      .insert(subscriptionEquipment)
      .values(data)
      .returning();
    return results[0] as SubscriptionEquipment;
  }

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

  async findActiveByClient(clientId: string, tenantId: string): Promise<SubscriptionEquipment[]> {
    const results = await db
      .select({
        id: subscriptionEquipment.id,
        subscription_id: subscriptionEquipment.subscription_id,
        slot_index: subscriptionEquipment.slot_index,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        otp: subscriptionEquipment.otp,
        otp_expires_at: subscriptionEquipment.otp_expires_at,
        nextcloud_username: subscriptionEquipment.nextcloud_username,
        nextcloud_password: subscriptionEquipment.nextcloud_password,
        tenant_id: subscriptionEquipment.tenant_id,
        created_at: subscriptionEquipment.created_at,
        updated_at: subscriptionEquipment.updated_at,
      })
      .from(subscriptionEquipment)
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

  async findAllWithDetails(): Promise<EquipmentWithDetails[]> {
    const results = await db
      .select({
        id: subscriptionEquipment.id,
        subscription_id: subscriptionEquipment.subscription_id,
        slot_index: subscriptionEquipment.slot_index,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        device_serial: subscriptionEquipment.device_serial,
        otp: subscriptionEquipment.otp,
        otp_expires_at: subscriptionEquipment.otp_expires_at,
        nextcloud_username: subscriptionEquipment.nextcloud_username,
        nextcloud_password: subscriptionEquipment.nextcloud_password,
        tenant_id: subscriptionEquipment.tenant_id,
        created_at: subscriptionEquipment.created_at,
        updated_at: subscriptionEquipment.updated_at,
        client_name: users.name,
        client_email: users.email,
        client_role: users.role,
        service_name: subscriptions.service_name,
        plan: subscriptions.plan,
        tenant_name: tenants.name,
        subscription_status: subscriptions.status,
      })
      .from(subscriptionEquipment)
      .innerJoin(subscriptions, eq(subscriptionEquipment.subscription_id, subscriptions.id))
      .innerJoin(users, eq(subscriptions.client_id, users.id))
      .innerJoin(tenants, eq(subscriptionEquipment.tenant_id, tenants.id))
      .where(
        and(
          eq(users.role, 'CLIENT'),
          or(
            eq(subscriptions.status, 'ACTIVE'),
            eq(subscriptions.status, 'EXPIRING')
          )
        )
      )
      .orderBy(desc(subscriptionEquipment.created_at));
    return results as EquipmentWithDetails[];
  }

  async findByTenantId(tenantId: string): Promise<SubscriptionEquipment[]> {
    const results = await db
      .select()
      .from(subscriptionEquipment)
      .where(eq(subscriptionEquipment.tenant_id, tenantId));
    return results as SubscriptionEquipment[];
  }
}


export const equipmentRepository = new EquipmentRepository();
