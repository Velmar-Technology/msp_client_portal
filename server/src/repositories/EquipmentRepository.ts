import { BaseRepository } from './BaseRepository';
import { SubscriptionEquipment } from '../types';
import { db, subscriptionEquipment } from '../db';
import { eq, and } from 'drizzle-orm';

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
}

export const equipmentRepository = new EquipmentRepository();
