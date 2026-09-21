import {
  db,
  userNavViews,
  tickets,
  ticketResponses,
  rmmAlerts,
  deviceMaintenances,
  invoices,
  leads,
  notifications,
} from '@shared/db';
import { eq, and, gt, count, sql, notInArray, or, isNull, ne } from 'drizzle-orm';
import { UserContext, UserRole } from '@shared/types';
import type { NavKey } from '@shared/contracts';

const EPOCH = new Date(0);

/**
 * Data repository for navigation counters and user seen-markers.
 * Encapsulates all Drizzle ORM operations for nav badges and view timestamps.
 */
export class NavCounterRepository {
  /**
   * Retrieves the last seen timestamp for a specific user and nav key.
   *
   * @param userId - User unique identifier
   * @param navKey - Navigation key
   * @returns Date representing last seen time or epoch if never seen
   */
  async getSeenAt(userId: string, navKey: NavKey): Promise<Date> {
    const rows = await db
      .select({ last_seen_at: userNavViews.last_seen_at })
      .from(userNavViews)
      .where(and(eq(userNavViews.user_id, userId), eq(userNavViews.nav_key, navKey)))
      .limit(1);

    return rows.length > 0 ? rows[0].last_seen_at ?? EPOCH : EPOCH;
  }

  /**
   * Updates or inserts the seen marker timestamp for a navigation key.
   *
   * @param ctx - User context
   * @param navKey - Destination navigation key
   */
  async upsertSeen(ctx: UserContext, navKey: NavKey): Promise<void> {
    const now = new Date();
    const existing = await db
      .select({ id: userNavViews.id })
      .from(userNavViews)
      .where(and(eq(userNavViews.user_id, ctx.userId), eq(userNavViews.nav_key, navKey)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userNavViews)
        .set({ last_seen_at: now, updated_at: now })
        .where(eq(userNavViews.id, existing[0].id));
    } else {
      await db.insert(userNavViews).values({
        user_id: ctx.userId,
        nav_key: navKey,
        last_seen_at: now,
        tenant_id: ctx.tenantId,
      });
    }
  }

  /**
   * Counts unread actionable tickets for a user since a given timestamp.
   *
   * @param ctx - User context
   * @param since - Cutoff timestamp
   * @returns Count of unread tickets and the latest activity timestamp
   */
  async countTickets(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const conditions = [
      gt(tickets.updated_at, since),
      notInArray(tickets.status, ['CLOSED', 'CANCELLED', 'RESOLVED', 'RESOLVED_AUTOMATED']),
    ];

    if (ctx.role === UserRole.CLIENT) {
      conditions.push(eq(tickets.client_id, ctx.userId));
    } else if (ctx.role === UserRole.TECHNICIAN) {
      conditions.push(
        or(
          eq(tickets.assigned_tech_id, ctx.userId),
          and(isNull(tickets.assigned_tech_id), eq(tickets.status, 'OPEN')),
        )!,
      );
    } else {
      conditions.push(eq(tickets.tenant_id, ctx.tenantId));
    }

    // Exclude own-action noise
    conditions.push(
      or(
        and(ne(tickets.client_id, ctx.userId), gt(tickets.created_at, since)),
        sql`EXISTS (
          SELECT 1 FROM ${ticketResponses} tr
          WHERE tr.ticket_id = ${tickets.id}
            AND tr.user_id != ${ctx.userId}
            AND tr.created_at > ${since}
            ${ctx.role === UserRole.CLIENT ? sql`AND tr.is_internal = false` : sql``}
        )`,
      )!,
    );

    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${tickets.updated_at})`,
      })
      .from(tickets)
      .where(and(...conditions));

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  /**
   * Counts active device RMM alerts created since a given timestamp.
   */
  async countDeviceAlerts(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${rmmAlerts.created_at})`,
      })
      .from(rmmAlerts)
      .where(
        and(
          eq(rmmAlerts.tenant_id, ctx.tenantId),
          gt(rmmAlerts.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  /**
   * Counts pending maintenance tasks updated since a given timestamp.
   */
  async countMaintenance(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${deviceMaintenances.updated_at})`,
      })
      .from(deviceMaintenances)
      .where(
        and(
          eq(deviceMaintenances.tenant_id, ctx.tenantId),
          gt(deviceMaintenances.updated_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  /**
   * Counts new invoices created since a given timestamp.
   */
  async countInvoices(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${invoices.created_at})`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenant_id, ctx.tenantId),
          gt(invoices.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  /**
   * Counts updated CRM leads since a given timestamp.
   */
  async countLeads(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${leads.updated_at})`,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenant_id, ctx.tenantId),
          gt(leads.updated_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  /**
   * Counts unread notifications created since a given timestamp.
   */
  async countNotifications(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${notifications.created_at})`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, ctx.userId),
          eq(notifications.read, false),
          gt(notifications.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }
}

export const navCounterRepository = new NavCounterRepository();
