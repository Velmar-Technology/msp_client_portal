import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Subscription, SubscriptionStatus } from '@shared/types';
import { db, subscriptions, plans, users, tenants } from '@shared/db';
import { eq, desc, and, or, lt, lte, gt, isNull, ne } from 'drizzle-orm';

/**
 * Data repository for client subscriptions, PayPal agreement IDs, renewals, and expiration warnings.
 */
export class SubscriptionRepository extends BaseRepository<Subscription> {
  /**
   * Initializes SubscriptionRepository for the subscriptions database table.
   */
  constructor() {
    super(subscriptions, 'subscriptions');
  }

  /**
   * Retrieves all subscription contracts belonging to a specific tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of Subscription entities
   */
  async findByTenant(tenantId: string): Promise<Subscription[]> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenant_id, tenantId))
      .orderBy(desc(subscriptions.created_at));
    return results as Subscription[];
  }

  /**
   * Retrieves subscriptions belonging to a specific client user and optional tenant organization.
   *
   * @param clientId - Client user UUID
   * @param tenantId - Optional tenant UUID
   * @returns Array of Subscription entities
   */
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

  /**
   * Finds a subscription by its external PayPal order or subscription agreement ID.
   *
   * @param paypalOrderId - PayPal ID
   * @returns Subscription entity or null if not found
   */
  async findByPaypalOrderId(paypalOrderId: string): Promise<Subscription | null> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paypal_order_id, paypalOrderId))
      .limit(1);
    return (results[0] as Subscription) || null;
  }

  /**
   * Inserts a new subscription contract record.
   *
   * @param data - Subscription creation attributes
   * @returns Created Subscription entity
   */
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

  /**
   * Updates the plan tier or equipment slot limit on a subscription.
   *
   * @param id - Subscription UUID
   * @param plan - New plan tier string
   * @param equipmentCount - Optional new equipment count
   * @returns Updated Subscription entity or null
   */
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

  /**
   * Updates the lifecycle status of a subscription.
   *
   * @param id - Subscription UUID
   * @param status - Target SubscriptionStatus
   * @returns Updated Subscription entity or null
   */
  async updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription | null> {
    const results = await db
      .update(subscriptions)
      .set({ status })
      .where(eq(subscriptions.id, id))
      .returning();
    return (results[0] as Subscription) || null;
  }

  /**
   * Finds active or expiring subscriptions whose renewal date is in the past for renewal processing.
   *
   * @param now - Reference timestamp
   * @returns Array of subscriptions due for renewal
   */
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

  /**
   * Finds active subscriptions expiring before a threshold date that have not received advance warnings.
   *
   * @param thresholdDate - Date boundary for warnings
   * @param now - Current reference timestamp
   * @returns Array of expiring subscriptions
   */
  async findExpiringSoon(thresholdDate: Date, now: Date): Promise<Subscription[]> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'ACTIVE'),
          isNull(subscriptions.last_warning_sent_at),
          gt(subscriptions.renewal_date, now),
          lte(subscriptions.renewal_date, thresholdDate)
        )
      );
    return results as Subscription[];
  }

  /**
   * Updates the timestamp when an advance expiration warning was sent for this subscription.
   *
   * @param id - Subscription UUID
   * @param sentAt - Timestamp of warning
   */
  async updateLastExpiryWarningSentAt(id: string, sentAt: Date): Promise<void> {
    await db
      .update(subscriptions)
      .set({ last_warning_sent_at: sentAt })
      .where(eq(subscriptions.id, id));
  }

  /**
   * Updates the renewal date and resets warning timestamps on a renewed subscription.
   *
   * @param id - Subscription UUID
   * @param renewalDate - Next renewal date
   * @param status - Updated subscription status
   * @returns Updated Subscription entity or null
   */
  async updateRenewal(id: string, renewalDate: Date, status: SubscriptionStatus): Promise<Subscription | null> {
    const results = await db
      .update(subscriptions)
      .set({
        renewal_date: renewalDate,
        status,
        last_warning_sent_at: null,
        updated_at: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();
    return (results[0] as Subscription) || null;
  }

  /**
   * Updates partial subscription details such as renewal date or service display title.
   *
   * @param id - Subscription UUID
   * @param data - Partial update payload
   * @returns Updated Subscription entity or null
   */
  async updateSubscriptionDetails(
    id: string,
    data: Partial<Pick<Subscription, 'renewal_date' | 'service_name' | 'status' | 'plan' | 'equipment_count'>>
  ): Promise<Subscription | null> {
    const results = await db
      .update(subscriptions)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();
    return (results[0] as Subscription) || null;
  }

  /**
   * Retrieves all currently active and expiring subscriptions.
   *
   * @returns Array of active/expiring Subscription entities
   */
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

  /**
   * Retrieves active subscriptions joined with plan pricing details for MRR calculations.
   *
   * @param tenantId - Optional tenant UUID filter
   * @returns Array of subscription records with plan price
   */
  async getActiveSubscriptionsWithPlan(tenantId?: string): Promise<any[]> {
    const conditions = [
      or(
        eq(subscriptions.status, 'ACTIVE'),
        eq(subscriptions.status, 'EXPIRING')
      ),
      ne(users.role, 'ADMIN'),
      ne(tenants.subdomain, 'admin')
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
      .innerJoin(users, eq(subscriptions.client_id, users.id))
      .innerJoin(tenants, eq(subscriptions.tenant_id, tenants.id))
      .where(and(...conditions));
    return results;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
