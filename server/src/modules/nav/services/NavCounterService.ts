import { db, userNavViews, tickets, rmmAlerts, deviceMaintenances, invoices, leads, notifications } from '@shared/db';
import { eq, and, gt, count, sql } from 'drizzle-orm';
import { UserContext, UserRole } from '@shared/types';
import type { NavKey } from '@shared/contracts';

const EPOCH = new Date(0);

const ROLE_NAV_KEYS: Record<UserRole, NavKey[]> = {
  [UserRole.CLIENT]: ['tickets', 'devices', 'resources', 'passwordManager', 'billing', 'maintenance'],
  [UserRole.TECHNICIAN]: ['tickets', 'maintenance'],
  [UserRole.ADMIN]: ['crm', 'tickets', 'billing', 'devices', 'maintenance'],
};

export class NavCounterService {
  async getCounters(ctx: UserContext): Promise<Record<NavKey, { count: number; latestAt: string | null }>> {
    const keys = ROLE_NAV_KEYS[ctx.role] ?? [];
    const result: Record<string, { count: number; latestAt: string | null }> = {};

    for (const navKey of keys) {
      const since = await this.getSeenAt(ctx.userId, navKey);
      const { count: c, latestAt } = await this.querySourceCount(ctx, navKey, since);
      result[navKey] = { count: c, latestAt };
    }

    return result as Record<NavKey, { count: number; latestAt: string | null }>;
  }

  async markSeen(ctx: UserContext, navKey: NavKey): Promise<void> {
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

  private async getSeenAt(userId: string, navKey: NavKey): Promise<Date> {
    const rows = await db
      .select({ last_seen_at: userNavViews.last_seen_at })
      .from(userNavViews)
      .where(and(eq(userNavViews.user_id, userId), eq(userNavViews.nav_key, navKey)))
      .limit(1);

    return rows.length > 0 ? rows[0].last_seen_at ?? EPOCH : EPOCH;
  }

  private async querySourceCount(
    ctx: UserContext,
    navKey: NavKey,
    since: Date,
  ): Promise<{ count: number; latestAt: string | null }> {
    switch (navKey) {
      case 'tickets':
        return this.countTickets(ctx, since);
      case 'devices':
        return this.countDeviceAlerts(ctx, since);
      case 'maintenance':
        return this.countMaintenance(ctx, since);
      case 'billing':
        return this.countInvoices(ctx, since);
      case 'crm':
        return this.countLeads(ctx, since);
      case 'notifications':
        return this.countNotifications(ctx, since);
      default:
        return { count: 0, latestAt: null };
    }
  }

  private async countTickets(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const conditions = [gt(tickets.updated_at, since)];

    if (ctx.role === UserRole.CLIENT) {
      conditions.push(eq(tickets.client_id, ctx.userId));
    } else if (ctx.role === UserRole.TECHNICIAN) {
      conditions.push(eq(tickets.assigned_tech_id, ctx.userId));
    } else {
      conditions.push(eq(tickets.tenant_id, ctx.tenantId));
    }

    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${tickets.updated_at})`,
      })
      .from(tickets)
      .where(and(...conditions));

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  private async countDeviceAlerts(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
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

  private async countMaintenance(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
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

  private async countInvoices(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
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

  private async countLeads(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${leads.updated_at})`,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenant_id, ctx.tenantId),
          gt(leads.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  private async countNotifications(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
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

export const navCounterService = new NavCounterService();
