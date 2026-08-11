import { BaseRepository } from './BaseRepository';
import { Subscription, SubscriptionStatus } from '../types';
import { db, subscriptions, plans } from '../db';
import { eq, desc, and, or, lt } from 'drizzle-orm';

export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor() {
    super(subscriptions, 'subscriptions');
  }

  async findByTenant(tenantId: string): Promise<Subscription[]> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenant_id, tenantId))
      .orderBy(desc(subscriptions.created_at));
    return results as Subscription[];
  }

  async findByClient(clientId: string, tenantId?: string): Promise<Subscription[]> {
    const conditions = [eq(subscriptions.client_id, clientId)];
    if (tenantId) {
      conditions.push(eq(subscriptions.tenant_id, tenantId));
    }
    const results = await db
      .select()
      .from(subscriptions)
      .where(and(...conditions))
      .orderBy(desc(subscriptions.created_at));
    return results as Subscription[];
  }

  async findByPaypalOrderId(paypalOrderId: string): Promise<Subscription | null> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paypal_order_id, paypalOrderId))
      .limit(1);
    return (results[0] as Subscription) || null;
  }

  async create(data: {
    client_id: string;
    service_name: string;
    plan: string;
    equipment_count: number;
    renewal_date: Date;
    tenant_id: string;
    paypal_order_id?: string;
    status?: SubscriptionStatus;
  }): Promise<Subscription> {
    const results = await db
      .insert(subscriptions)
      .values({
        client_id: data.client_id,
        service_name: data.service_name,
        plan: data.plan,
        equipment_count: data.equipment_count,
        renewal_date: data.renewal_date,
        tenant_id: data.tenant_id,
        paypal_order_id: data.paypal_order_id,
        ...(data.status ? { status: data.status } : {}),
      })
      .returning();
    return results[0] as Subscription;
  }

  async updatePlan(id: string, plan: string, equipmentCount?: number): Promise<Subscription | null> {
    const updateData: any = { plan };
    if (equipmentCount !== undefined) {
      updateData.equipment_count = equipmentCount;
    }

    const results = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id))
      .returning();
    return (results[0] as Subscription) || null;
  }

  async updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription | null> {
    const results = await db
      .update(subscriptions)
      .set({ status })
      .where(eq(subscriptions.id, id))
      .returning();
    return (results[0] as Subscription) || null;
  }

  async findPendingRenewal(now: Date): Promise<Subscription[]> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          or(
            eq(subscriptions.status, 'ACTIVE'),
            eq(subscriptions.status, 'EXPIRING')
          ),
          lt(subscriptions.renewal_date, now)
        )
      );
    return results as Subscription[];
  }

  async updateRenewal(id: string, renewalDate: Date, status: SubscriptionStatus): Promise<Subscription | null> {
    const results = await db
      .update(subscriptions)
      .set({
        renewal_date: renewalDate,
        status,
        updated_at: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();
    return (results[0] as Subscription) || null;
  }

  async findAllActive(): Promise<Subscription[]> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(
        or(
          eq(subscriptions.status, 'ACTIVE'),
          eq(subscriptions.status, 'EXPIRING')
        )
      );
    return results as Subscription[];
  }

  async getActiveSubscriptionsWithPlan(tenantId?: string): Promise<any[]> {
    const conditions = [
      or(
        eq(subscriptions.status, 'ACTIVE'),
        eq(subscriptions.status, 'EXPIRING')
      )
    ];
    if (tenantId) {
      conditions.push(eq(subscriptions.tenant_id, tenantId));
    }
    const results = await db
      .select({
        id: subscriptions.id,
        planId: subscriptions.plan,
        equipmentCount: subscriptions.equipment_count,
        status: subscriptions.status,
        created_at: subscriptions.created_at,
        price: plans.price,
        tenant_id: subscriptions.tenant_id,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.plan, plans.id))
      .where(and(...conditions));
    return results;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
